# CLAUDE.md

## Project Overview

`@mnaoumov/create-obsidian-plugin` — an npm scaffolding CLI that generates Obsidian plugin projects from modern templates. Uses EJS for templating with a partial-based composition system.

## Architecture

- `src/` — Core generator logic (TemplateBuilder, features, prompts, templates)
- `src/features/` — Feature modules (BuildSystem, Formatter, Linter, TestRunner, etc.)
- `templates/default/` — EJS template files (all must have `.ejs` extension)
- `scripts/` — All build/lint/test logic lives here
- `__tests__/` — Unit tests (vitest)
- `dist/` — Built output (published to npm, not tracked in git)

## Design Decisions

### No obsidian ecosystem dependencies in the generator

The generator project itself must NOT depend on `obsidian`, `obsidian-typings`, or `obsidian-dev-utils`. These are only used in the *generated* plugin projects.

### Two-tier script strategy

- **Enhanced/demo presets** (uses-obsidian-dev-utils): one-liner wrapper scripts that call `obsidian-dev-utils <command>`. Updates propagate via `npm update`.
- **Standalone preset**: fully inlined self-contained scripts with no obsidian-dev-utils dependency.

### Root configs are thin wrappers

All actual logic lives in `scripts/`. Root config files (`eslint.config.mts`, `commitlint.config.ts`, `vitest.config.ts`) are minimal re-exports from `scripts/`. Root `package.json` scripts all use `jiti scripts/*.ts`.

### addScript single-arg convention

`addScript(name)` defaults to `jiti scripts/{name.replaceAll(':', '-')}.ts`. Each npm script maps 1:1 to a script file. Only pass a second arg for non-standard commands.

### addFiles uses array syntax, no .ejs suffix

`addFiles(['file1', 'file2'])` — registered paths never include `.ejs`. Resolution happens at template level: check `{path}.ejs` on disk, or auto-render from partials.

### Partial template composition

- `_` in filename basename = partial (skipped in main render loop)
- `render(section)` auto-discovers partials by convention: `{basePath}_{section}_{partial}.ejs` — always use a section name
- `buildTemplate()` auto-adds feature setting values as partials after `configure()`
- Virtual templates: if no file exists on disk, `render()` composes from partials

### fundingUrl uses partial system

Not always-include, not `<% if`. Uses `has-funding` partial — conditionally added when `answers.fundingUrl` is set. Partial files: `manifest.json_has-funding.ejs`, `README.md_support_has-funding.ejs`.

### Logicless templates

Templates must be logicless — no `<% if %>` conditionals. Use the partial system for conditional content. Loops (`<% for %>`) are acceptable for iterating data. All conditional logic is handled by which partials are included, not by branching in templates.

### Template engine: EJS

Researched all major `create-*` packages. Only create-vue and create-nuxt-app use a template engine (both EJS). The rest use plain file copying. EJS is the only engine used in practice by major scaffolding tools.

## Workflow

- Commit after each logical step. Do not batch unrelated changes into a single commit.

## Code Style

- TypeScript strict mode
- ESLint with `@eslint/js` + `typescript-eslint`
- Conventional commits (commitlint)
- Tests with vitest, test files in `__tests__/`

---

## Expansion Plan

Implement the phases below in order. After each commit: `npx tsc --noEmit`, `npm test`, `npm run lint`.

### Phase 0: Convention Changes

#### 0.1 Rename `uses-obsidian-dev-utils` partial to `enhanced`
- Update `src/features/Preset/Enhanced.ts`: `addPartial('enhanced')`
- Update `src/features/Preset/Demo.ts`: `addPartial('enhanced')`
- Rename template files:
  - `tsconfig.json_uses-obsidian-dev-utils*.ejs` -> `tsconfig.json_enhanced*.ejs` (6 files)
  - `README.md_preset_uses-obsidian-dev-utils.ejs` -> `README.md_preset_enhanced.ejs`
  - `src/styles/main.scss_non-standalone.ejs` -> check if this should be `_enhanced`
  - Any other `_uses-obsidian-dev-utils` template files

#### 0.2 Adopt `@` section separator in template naming
Update `render()` in `src/templates.ts` to use `@` for sections:
```typescript
const partialPath = section
  ? `${basePath}@${section}_${partial}.ejs`    // was: `${basePath}_${section}_${partial}.ejs`
  : `${basePath}_${partial}.ejs`;
```

Rename ALL existing section-based template files (files with `_{section}_{partial}` pattern):
- `Plugin.ts_enhanced_import_*.ejs` -> `Plugin.ts_enhanced@import_*.ejs`
- `Plugin.ts_enhanced_import2_*.ejs` -> `Plugin.ts_enhanced@import2_*.ejs`
- `Plugin.ts_enhanced_class-body_*.ejs` -> `Plugin.ts_enhanced@class-body_*.ejs`
- `Plugin.ts_enhanced_onload_*.ejs` -> `Plugin.ts_enhanced@onload_*.ejs`
- `Plugin.ts_enhanced_method_*.ejs` -> `Plugin.ts_enhanced@method_*.ejs`
- `manifest.json_funding_*.ejs` -> `manifest.json@funding_*.ejs`
- `manifest.json_platform_*.ejs` -> `manifest.json@platform_*.ejs`
- `README.md_preset_*.ejs` -> `README.md@preset_*.ejs`
- `README.md_support_*.ejs` -> `README.md@support_*.ejs`
- `tsconfig.json_*_compiler-options_*.ejs` -> `tsconfig.json_*@compiler-options_*.ejs`
- `tsconfig.json_*_include_*.ejs` -> `tsconfig.json_*@include_*.ejs`
- `tsconfig.json_*_include-extra_*.ejs` -> `tsconfig.json_*@include-extra_*.ejs`
- `tsconfig.json_*_types_*.ejs` -> `tsconfig.json_*@types_*.ejs`
- `rollup.config.ts_import_*.ejs` -> `rollup.config.ts@import_*.ejs`
- `rollup.config.ts_pre-plugin_*.ejs` -> `rollup.config.ts@pre-plugin_*.ejs`
- `rollup.config.ts_post-plugin_*.ejs` -> `rollup.config.ts@post-plugin_*.ejs`
- `vite.config.ts_import_*.ejs` -> `vite.config.ts@import_*.ejs`
- `vite.config.ts_plugin_*.ejs` -> `vite.config.ts@plugin_*.ejs`
- `build.ts_esbuild_import_*.ejs` -> `build.ts_esbuild@import_*.ejs`
- `build.ts_esbuild_plugin_*.ejs` -> `build.ts_esbuild@plugin_*.ejs`
- `build.ts_esbuild_options_*.ejs` -> `build.ts_esbuild@options_*.ejs`
- `build.ts_esbuild_compile_*.ejs` -> `build.ts_esbuild@compile_*.ejs`
- `build.ts_rollup_compile_*.ejs` -> `build.ts_rollup@compile_*.ejs`
- `build.ts_vite_compile_*.ejs` -> `build.ts_vite@compile_*.ejs`
- `eslint.config.mts_brands_*.ejs` -> `eslint.config.mts@brands_*.ejs`
- `src/main.ts_import_*.ejs` -> `src/main.ts@import_*.ejs`
- `.gitignore_*.ejs` stays as-is (no sections, just partials)

Also update all `render('section')` calls in `.ejs` templates — these stay the same (render is called with section name as string, the `@` change is only in the filename resolution logic).

#### 0.3 Update tests for convention changes

### Phase 1: Fix Critical Bugs

#### 1.1 Fix CSS mode (Css creates .scss instead of .css)
- Create `templates/default/src/styles/main.css.ejs`
- Create `templates/default/src/main.ts_import_css.ejs`
- Modify `src/features/CssMode/Css.ts`: `addFiles(['src/styles/main.css'])`

#### 1.2 Fix formatter configs
Root configs are thin wrappers; real logic in `scripts/`. No `.featurerc` files — use `feature.config.ts` or `feature.config.mjs` pattern.
- Create `templates/default/dprint.json.ejs` (dprint uses JSON config, no JS alternative)
- Create `templates/default/prettier.config.mjs.ejs` as thin wrapper to `scripts/prettier.config.ts`
- Create `templates/default/scripts/prettier.config.ts.ejs` with actual config
- Modify `src/features/Formatter/Dprint.ts`: add `addFiles(['dprint.json'])`
- Modify `src/features/Formatter/Prettier.ts`: add `addFiles(['prettier.config.mjs', 'scripts/prettier.config.ts'])`

#### 1.3 Fix Vue framework (no component templates)
- Create Vue SFC + View + type declarations (mirroring Svelte pattern)
- Create Plugin.ts partials: `_enhanced@import2_vue`, `_enhanced@class-body_vue`, `_enhanced@onload_vue`, `_enhanced@method_vue`
- Create tsconfig partials for `.vue` file includes
- Create eslint brand: `eslint.config.mts@brands_vue.ejs`
- Modify `src/features/Framework/Vue.ts`: add all component files
- Add Vue to `DEMO_OVERRIDES` in `src/templates.ts`

#### 1.4 Fix WASM (no example code)
- Create type stub for `.wasm` imports
- Create README with Rust/AssemblyScript setup instructions
- Create Plugin.ts partial with WASM import example
- Modify `src/features/WasmSupport/Wasm.ts`: add files

#### 1.5 Fix README.md
- Add development setup, CLI usage, config file docs

#### 1.6 Fix .env template
- Add `OBSIDIAN_CONFIG_FOLDER=` with comment

#### 1.7 Fix cspell.json
- Add Obsidian API dictionary words

#### 1.8 Add Jest test:watch
- Create `scripts/test-watch.ts_jest.ejs`
- Modify `src/features/TestRunner/Jest.ts`: add `test:watch` script

#### 1.9 Fix React+Rollup babel config
- Create `templates/default/babel.config.mjs.ejs` as thin wrapper to `scripts/babel.config.ts`
- Create `templates/default/scripts/babel.config.ts_rollup.ejs` with `@babel/preset-react`
- Modify `src/features/Framework/React.ts`: add config files when rollup

#### 1.10 Update tests

### Phase 2: Two-Tier Script System

#### 2.1 Restructure standalone build scripts
**Before:**
- `scripts/build.ts_esbuild.ejs` (full script)
- `scripts/build.ts_rollup.ejs` (full script)
- `scripts/build.ts_vite.ejs` (full script)

**After:**
- `scripts/build.ts_standalone.ejs` — shared build logic with `<%- render('bundler-import') %>`, `<%- render('bundler-run') %>` for bundler-specific parts
- `scripts/build.ts_standalone@bundler-run_esbuild.ejs` — esbuild context + watch
- `scripts/build.ts_standalone@bundler-run_rollup.ejs` — rollup CLI call
- `scripts/build.ts_standalone@bundler-run_vite.ejs` — vite CLI call
- `scripts/build.ts_enhanced.ejs` — `import { build } from 'obsidian-dev-utils/ScriptUtils/Commands'; await build();`

Same for `dev.ts`, `version.ts`.

#### 2.2 Move base scripts to Preset.configure()
- Remove `scripts/build.ts`, `scripts/dev.ts`, `scripts/version.ts` from BASE_TEMPLATE_FILES
- Remove `addScript('dev')`, `addScript('build')`, `addScript('version')` from base buildTemplate()
- Standalone.configure(): add scripts + files
- Enhanced.configure(): add scripts + files
- Demo.configure(): same as Enhanced

#### 2.3 Convert feature scripts to two-tier
For feature-added scripts (lint, format, spellcheck, lint-md, test, etc.):
- Create `scripts/lint.ts_standalone.ejs` (current standalone content)
- Create `scripts/lint.ts_enhanced.ejs` (wrapper: `import { lint } from 'obsidian-dev-utils/ScriptUtils/Commands'; await lint();`)

Since `standalone` and `enhanced` are mutually exclusive, only the matching partial renders.

obsidian-dev-utils has been refactored: CLI removed, functions exported from `obsidian-dev-utils/ScriptUtils/Commands`:
```typescript
import { build } from 'obsidian-dev-utils/ScriptUtils/Commands';
await build();
```

#### 2.4 Update tests

### Phase 3: Rename Features + New Feature Options

#### 3.1 Rename Framework -> UiFramework
- Rename directory, update Answers.ts (`framework` -> `uiFramework`), prompts.ts, templates.ts
- Add backward-compat migration in loadConfig()

#### 3.2 Rename CssMode -> Styling
- Same pattern (`cssMode` -> `styling`)

#### 3.3 Add Webpack bundler
- `src/features/BuildSystem/Webpack.ts` — packages: `webpack`, `webpack-cli`, `ts-loader`
- `templates/default/webpack.config.ts.ejs` with `render('import')`, `render('rules')`, `render('plugin')` sections
- Framework/CSS partials per bundler
- `scripts/build.ts_standalone@bundler-run_webpack.ejs`

#### 3.4 Add Parcel bundler
- `src/features/BuildSystem/Parcel.ts` — packages: `parcel`, `@parcel/config-default`
- `templates/default/.parcelrc.ejs`
- `scripts/build.ts_standalone@bundler-run_parcel.ejs`

#### 3.5 Add Biome linter
- `src/features/Linter/Biome.ts` — package: `@biomejs/biome`
- `templates/default/biome.json.ejs`
- `scripts/lint.ts_biome.ejs`, `scripts/lint-fix.ts_biome.ejs`

#### 3.6 Add Biome formatter
- `src/features/Formatter/Biome.ts`
- `scripts/format.ts_biome.ejs`, `scripts/format-check.ts_biome.ejs`
- Modify prompts.ts: when linter === 'biome', preselect formatter to 'biome' with recommendation

#### 3.7 Add Preact UI framework
- `src/features/UiFramework/Preact.ts` with BUILD_PLUGINS map
- Component + View templates, Plugin.ts partials, tsconfig jsx, eslint brand

#### 3.8 Add Solid UI framework
- `src/features/UiFramework/Solid.ts` — packages: `solid-js`, `vite-plugin-solid`
- Component + View templates, Plugin.ts partials

#### 3.9 Add Lit UI framework
- `src/features/UiFramework/Lit.ts` — package: `lit`
- `SampleLitElement.ts.ejs`, `SampleLitView.ts.ejs`

#### 3.10 Add PostCSS styling
- `src/features/Styling/PostCss.ts` — packages: `postcss`, `autoprefixer`
- Config templates (thin wrapper + scripts/)

#### 3.11 Add Tailwind CSS styling
- `src/features/Styling/Tailwind.ts` — packages: `tailwindcss`, `postcss`, `autoprefixer`
- Config templates (thin wrapper + scripts/)

#### 3.12 Add CSS Modules styling
- `src/features/Styling/CssModules.ts`
- Sample `.module.css` file + type declarations

#### 3.13 Update tests

### Phase 4: New Feature Categories

#### 4.1 GitHubActions feature
- `src/features/GitHubActions/` with CiWorkflow, CiAndRelease, None
- `.github/workflows/ci.yml.ejs` with `render('steps')` for tool-specific steps
- `.github/workflows/release.yml.ejs`
- Add `gitHubActions: string` to Answers

#### 4.2 CommitLinting feature
- `src/features/CommitLinting/` with ConventionalCommits, None
- Packages: commitlint, husky, lint-staged
- Templates: `commitlint.config.ts.ejs` (thin wrapper), `.husky/` hooks
- Add `commitLinting: string` to Answers

#### 4.3 Internationalization feature
- `src/features/Internationalization/` with I18next, TypesafeI18n, None
- Templates: `src/i18n/index.ts.ejs`, locale JSON files
- Plugin.ts partials for i18n initialization
- Add `internationalization: string` to Answers

#### 4.4 HotReload feature
- `src/features/HotReload/` with HotReloadPlugin, None
- Make `.hotreload` marker creation conditional
- Add `hotReload: string` to Answers

#### 4.5 Update DEMO_OVERRIDES for all new features
#### 4.6 Update tests

### Phase 5: Enhanced Samples and Polish

#### 5.1 Better sample code
- Working word counter (CodeMirror StateField)
- Working inline widget (CodeMirror Widget)
- Form-based modal example
- Proper view examples per UI framework

#### 5.2 E2E test samples with real assertions
- obsidian-test: verify plugin loads, command exists
- wdio: test UI interactions

#### 5.3 README.md with full documentation

### Appendix: obsidian-dev-utils Refactoring

obsidian-dev-utils needs to support multiple tools per category. New command naming: `{action}{Tool}` (e.g., `buildEsbuild`, `lintEslint`, `formatDprint`). Directory structure moves to `builders/`, `linters/`, `formatters/`, `testRunners/`. Commands.ts becomes barrel re-export with backward compat aliases. Shared builder logic extracted to `builders/shared.ts`. This is a separate project at `F:\dev\projects\!obsidian\obsidian-dev-utils\`.
