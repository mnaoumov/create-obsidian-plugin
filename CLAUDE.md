# CLAUDE.md

## Project Overview

`@mnaoumov/create-obsidian-plugin` — an npm scaffolding CLI that generates Obsidian plugin projects from modern templates. Uses EJS for templating with a partial-based composition system.

## Architecture

- `src/` — Core generator logic (TemplateBuilder, features, prompts, templates)
- `src/features/` — Feature modules (BuildSystem, Formatter, Linter, TestRunner, etc.)
- `templates/default/` — EJS and plain template files
- `scripts/` — All build/lint/test logic lives here
- `__tests__/` — Unit tests (vitest)
- `dist/` — Built output (published to npm, not tracked in git)

## Design Decisions

### No obsidian ecosystem dependencies in the generator

The generator project itself must NOT depend on `obsidian`, `obsidian-typings`, or `obsidian-dev-utils`. These are only used in the *generated* plugin projects.

### Root configs are thin wrappers

All actual logic lives in `scripts/`. Root config files (`eslint.config.mts`, `commitlint.config.ts`, `vitest.config.ts`) are minimal re-exports from `scripts/`. Root `package.json` scripts all use `jiti scripts/*.ts`.

### addScript single-arg convention

`addScript(name)` defaults to `jiti scripts/{name.replaceAll(':', '-')}.ts`. Each npm script maps 1:1 to a script file. Only pass a second arg for non-standard commands.

### addFiles uses array syntax, no .ejs suffix

`addFiles(['file1', 'file2'])` — registered paths never include `.ejs`. Resolution happens at template level: check `{path}.ejs` on disk first, then `{path}`, then auto-render from partials.

### Partial template composition

- `_` in filename basename = partial (skipped in main render loop)
- `render(section?)` auto-discovers partials by convention: `{basePath}_{partial}.ejs` or `{basePath}_{section}_{partial}.ejs`
- `buildTemplate()` auto-adds feature setting values as partials after `configure()`
- Virtual templates: if no file exists on disk, `render()` composes from partials

### fundingUrl uses partial system

Not always-include, not `<% if`. Uses `has-funding` partial — conditionally added when `answers.fundingUrl` is set. Partial files: `manifest.json_has-funding.ejs`, `README.md_support_has-funding.ejs`.

### Template engine: EJS

Researched all major `create-*` packages. Only create-vue and create-nuxt-app use a template engine (both EJS). The rest use plain file copying. EJS is the only engine used in practice by major scaffolding tools.

## Workflow

- Commit after each logical step. Do not batch unrelated changes into a single commit.

## Code Style

- TypeScript strict mode
- ESLint with `@eslint/js` + `typescript-eslint`
- Conventional commits (commitlint)
- Tests with vitest, test files in `__tests__/`
