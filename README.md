# Create Obsidian Plugin

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)
[![GitHub release](https://img.shields.io/github/v/release/mnaoumov/create-obsidian-plugin)](https://github.com/mnaoumov/create-obsidian-plugin/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/create-obsidian-plugin/total)](https://github.com/mnaoumov/create-obsidian-plugin/releases)

A scaffolding CLI that generates [Obsidian](https://obsidian.md/) plugin projects from modern templates. Supports creating new plugins and updating existing ones.

## Create a new plugin

| Package manager | Runner | Command                                      |
|-----------------|--------|----------------------------------------------|
| npm             | create | `npm create @mnaoumov/obsidian-plugin`       |
| npm             | npx    | `npx @mnaoumov/create-obsidian-plugin`       |
| pnpm            | create | `pnpm create @mnaoumov/obsidian-plugin`      |
| pnpm            | dlx    | `pnpm dlx @mnaoumov/create-obsidian-plugin`  |
| yarn            | create | `yarn create @mnaoumov/obsidian-plugin`      |
| yarn            | dlx    | `yarn dlx @mnaoumov/create-obsidian-plugin`  |
| bun             | create | `bun create @mnaoumov/obsidian-plugin`       |
| bun             | bunx   | `bunx @mnaoumov/create-obsidian-plugin`      |

This walks you through an interactive wizard to scaffold a new Obsidian plugin project with optional post-scaffold actions (npm install, git init, GitHub repo creation).

## Update an existing plugin

Run the same command inside a project previously created with this tool:

```bash
npm create @mnaoumov/obsidian-plugin
```

The updater will:

- Detect the existing project via `.create-obsidian-plugin.json`
- Compare file hashes to detect local modifications
- Update unmodified files to the latest template version
- Skip files you've customized (with a warning)
- Create any new files added to the template

## Feature options

The wizard lets you pick and choose from the following categories:

### Preset

| Option         | Description                                                                                                              |
|----------------|--------------------------------------------------------------------------------------------------------------------------|
| Demo           | All features enabled for demonstration                                                                                   |
| Enhanced       | Recommended. Uses [obsidian-dev-utils](https://github.com/mnaoumov/obsidian-dev-utils) for settings, linting, and more   |
| Standalone     | Standalone plugin without obsidian-dev-utils dependency                                                                  |

### Bundler

| Option  | Description                                |
|---------|--------------------------------------------|
| esbuild | Fast and simple (recommended)              |
| Parcel  | Zero-config bundler                        |
| Rollup  | Flexible with plugin ecosystem             |
| Vite    | Modern dev server with HMR                 |
| Webpack | Mature bundler with broad plugin support   |

### UI framework

| Option  | Description                                  |
|---------|----------------------------------------------|
| (none)  | Plain TypeScript, no UI framework            |
| Lit     | Web Components with declarative templates    |
| Preact  | Lightweight React alternative (3kB)          |
| React   | Component-based UI with JSX                  |
| Solid   | Fine-grained reactivity, no virtual DOM      |
| Svelte  | Lightweight reactive components              |
| Vue     | Progressive framework with SFC               |

### Linter

| Option | Description                                  |
|--------|----------------------------------------------|
| (none) | No linting                                   |
| Biome  | Fast linter and formatter                    |
| ESLint | Industry standard for JavaScript/TypeScript  |

### Formatter

| Option   | Description                          |
|----------|--------------------------------------|
| (none)   | No formatting                        |
| Biome    | Fast formatter (pairs with Biome linter) |
| dprint   | Fast, pluggable, written in Rust     |
| Prettier | Opinionated, widely adopted          |

### Spell checker

| Option | Description                              |
|--------|------------------------------------------|
| (none) | No spell checking                        |
| cspell | Configurable spell checker for code      |

### Markdown linter

| Option       | Description                                        |
|--------------|----------------------------------------------------|
| (none)       | No Markdown linting                                |
| markdownlint | Lint Markdown files for style and consistency      |

### Unit testing

| Option | Description                     |
|--------|---------------------------------|
| (none) | No unit testing                 |
| Jest   | Feature-rich, widely adopted    |
| Vitest | Fast, Vite-native, ESM-first   |

### E2E testing

| Option        | Description                                                    |
|---------------|----------------------------------------------------------------|
| (none)        | No E2E testing                                                 |
| obsidian-test | Tests run inside Obsidian with real app APIs                   |
| wdio-obsidian | WebdriverIO service for Obsidian, multi-version and CI/CD      |

### Editor extensions

| Option    | Description                                              |
|-----------|----------------------------------------------------------|
| (none)    | No editor extensions                                     |
| CodeMirror | CodeMirror 6 state fields, view plugins, decorations    |

### Styling

| Option       | Description                                   |
|--------------|-----------------------------------------------|
| (none)       | No custom styles                              |
| CSS          | Plain CSS styles                              |
| CSS Modules  | Scoped CSS with .module.css files             |
| PostCSS      | CSS with plugins (autoprefixer, nesting)      |
| SCSS         | Sass/SCSS preprocessor                        |
| Tailwind CSS | Utility-first CSS framework                   |

### WebAssembly support

| Option | Description                      |
|--------|----------------------------------|
| (none) | No WASM                          |
| WASM   | Import and use .wasm modules     |

### Commit linting

| Option                | Description                        |
|-----------------------|------------------------------------|
| (none)                | No commit linting                  |
| Conventional Commits  | commitlint + husky + lint-staged   |

### Hot reload

| Option            | Description                                                                          |
|-------------------|--------------------------------------------------------------------------------------|
| (none)            | No hot reload support                                                                |
| Hot Reload Plugin | Creates `.hotreload` marker for [pjeby/hot-reload](https://github.com/pjeby/hot-reload) |
| Obsidian CLI      | Reloads via `obsidian plugin:reload` CLI command                                     |

### Internationalization

| Option        | Description                                   |
|---------------|-----------------------------------------------|
| (none)        | No internationalization                       |
| i18next       | Popular i18n framework with JSON translations |
| typesafe-i18n | Type-safe i18n with auto-generated types      |

### GitHub Actions

| Option       | Description                                  |
|--------------|----------------------------------------------|
| (none)       | No GitHub Actions workflows                  |
| CI + Release | CI + automated release on tag push           |
| CI           | CI workflow only (lint, test, build)         |

### GitHub issue templates

| Option        | Description                                  |
|---------------|----------------------------------------------|
| (none)        | No issue templates                           |
| Bug & Feature | Bug report and feature request templates     |

### GitHub funding

| Option      | Description                                |
|-------------|--------------------------------------------|
| (none)      | No funding configuration                   |
| FUNDING.yml | GitHub Sponsors funding configuration      |

### Obsidian API subset

| Option               | Description                                                  |
|----------------------|--------------------------------------------------------------|
| Official API         | Stable, documented API only                                  |
| Official + Unofficial | Includes internal undocumented APIs (for experienced devs)  |

### Package manager

| Option | Description                            |
|--------|----------------------------------------|
| Bun    | Fast all-in-one JavaScript toolkit     |
| npm    | Default, comes with Node.js            |
| pnpm   | Fast, efficient disk space             |
| Yarn   | Classic alternative with workspaces    |

### Platform support

| Option             | Description                            |
|--------------------|----------------------------------------|
| Desktop and mobile | Plugin works on desktop and mobile     |
| Desktop only       | Plugin works only on desktop           |

## Configuration file

The `.create-obsidian-plugin.json` file stores:

- `generatorVersion` — version of the generator that created the project
- `fileHashes` — SHA-256 hashes of generated files for update detection

## Architecture

- **EJS templates** with a partial-based composition system
- **Logicless templates** — no `<% if %>` conditionals; conditional content via partials
- **Two-tier scripts** — standalone has full inline scripts; enhanced wraps obsidian-dev-utils
- **Root configs are thin wrappers** — actual logic lives in `scripts/`

## Sample output

See [Sample Plugin Extended](https://github.com/mnaoumov/obsidian-sample-plugin-extended).

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)
