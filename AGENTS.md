# AGENTS.md

## Project Overview

`@mnaoumov/create-obsidian-plugin` — an npm scaffolding CLI that generates Obsidian plugin projects from modern templates. Uses EJS for templating with a partial-based composition system.

## Architecture

- `src/` — Core generator logic (TemplateBuilder, features, prompts, templates), with the vitest unit tests co-located as `foo.test.ts` beside what they test
- `src/features/` — One kebab-case directory per question (`preset/`, `bundler/`, `ui-framework/`, `linter/`, `formatter/`, `test-runner/`, `styling/`, …), each holding one file per answer plus an `index.ts` exporting its options array. `FEATURE_REGISTRIES` in `src/templates.ts` is the list of them, and its order is the order partials are concatenated in.
- `templates/default/` — EJS template files (all must have `.ejs` extension)
- `scripts/` — All build/lint/test logic lives here
- `dist/` — Built output (published to npm, not tracked in git)

## Design Decisions

### No obsidian ecosystem dependencies in the generator

The generator project itself must NOT depend on `obsidian`, `obsidian-typings`, or `obsidian-dev-utils`. These are only used in the *generated* plugin projects.

### Two-tier script strategy

- **Enhanced/demo presets**: thin wrapper scripts that call the matching `obsidian-dev-utils` module — `script-utils/bundlers/esbuild`, `script-utils/linters/eslint`, `script-utils/test-runners/vitest`, `script-utils/version`, and so on, each wrapped in `wrapCliTask`. Updates propagate via `npm update`. There is no `script-utils/commands` barrel; every command has its own module.
- **Standalone preset**: fully inlined self-contained scripts with no obsidian-dev-utils dependency.

**The two format scripts are the documented exception: they split on the tool first, not the preset.**
What `npm run format` runs is decided by the formatter answer, and only dprint has a preset-specific
runner (dev-utils resolves `dprint.json` from the repo root and falls back to its bundled copy).
prettier and biome are a plain `execSync`, identical everywhere, so they are one file each shared by
every preset. Splitting on the preset first is what let the odu half import the dprint runner whatever
was chosen — installing prettier or biome, emitting its config, then running dprint over it, with
dprint not even a dependency.

### The chosen formatter runs once at generation time

The templates are authored in one style, the fleet's. dprint is configured to match it; prettier and
biome cannot be configured to reproduce it — biome collapses an empty object onto one line whatever the
settings say. So a project that picked either would be committed already failing its own
`format:check`. `runInitialFormat` (`src/main.ts`) runs the chosen formatter after install and before
the initial commit, which settles it in that tool's own style. Do not try to make the templates satisfy
all three.

Their configs still carry the project's excludes, because a formatter that actually runs will otherwise
rewrite `demo-vault/` — including `.obsidian/community-plugins.json`, which the demo-vault coverage
suite compares exactly. `.prettierignore` and `biome.json`'s `files.includes` mirror what `dprint.json`
already excluded. `biome.json` points `$schema` at the copy in `node_modules` rather than a pinned URL:
Biome refuses to start when the schema version does not match the CLI, and a pinned one goes stale on
the next major.

### jest owns its own compiler and module settings — the emitted `tsconfig.json` must stay `rootDir`-free

ts-jest compiles **with** emit whatever the tsconfig says, so TypeScript 6 raises **TS5011** ("the `rootDir`
setting must be explicitly set") against a config that infers its common source directory. The fix belongs in
`jest.config.ts`, as a `transform`-level `tsconfig: { rootDir: '.' }` — **not** in the emitted
`tsconfig.json`. That file declares `noEmit: true` and is read by more than tsc: `scripts/rollup.config.ts`
hands it to `@rollup/plugin-typescript`, and the odu presets run `buildCompileTypeScript` over it. Putting an
emit-layout option there changes what those tools see, for the sake of the one tool that ignores `noEmit`.
(`.` and not `./src`: the tsconfig's `include` also covers `./*.ts` and `./scripts/**/*.ts`.) ts-jest merges
the inline object over the discovered tsconfig rather than replacing it, which is what keeps this narrow.

**`rootDir` alone only gets to the second blocker.** Generated projects are `"type": "module"` with
`module: node16`, so ts-jest emits ESM, and jest treats `.ts` as CommonJS unless told otherwise — every suite
then dies on "Must use import to load ES Module". So the jest answer runs in ESM mode throughout:
`extensionsToTreatAsEsm: ['.ts']` plus `useESM: true`, and `scripts/test.ts` / `scripts/test-watch.ts` append
`--experimental-vm-modules` to `NODE_OPTIONS` because jest's ESM loader is built on `vm.SyntheticModule`,
which Node exposes only under that flag. All four pieces are load-bearing; drop any one and **zero tests run
while the exit code stays green**, which is why `src/templates.test.ts` asserts each of them.

The CommonJS alternative is a dead end, not an untried option: forcing `module: CommonJS` drags
`moduleResolution` down to `node10`, which TypeScript 6 rejects outright (TS5107, deprecated) and TypeScript 7
removes.

### Three preset partials: `odu`, `enhanced`, `demo`

`enhanced` and `demo` both build on `obsidian-dev-utils`, so they both contribute the **`odu`** partial for what they share (the `scripts/`, `tsconfig.json`, the styles, the framework components and views, the README preset section).

They must NOT share a partial for anything either one overrides. A registered file with no `.ejs` on disk is composed by concatenating EVERY matching partial, so a file with both an `_enhanced` and a `_demo` whole-file partial would be emitted twice over — which is exactly what happened while `Demo.configure` also added `enhanced`. `src/plugin.ts_enhanced*` and the three `plugin-settings*_enhanced` files therefore stay keyed on `enhanced`, which only that preset carries.

### The obsidian-dev-utils presets ship a demo vault

`demo-vault/` is the generated plugin's documentation (fleet rules G95/G98/G102/G104): notes that explain each feature and demonstrate it with `code-button`s run by CodeScript Toolkit. `obsidian-dev-utils` archives it into the GitHub release and injects the built plugin plus the `demo-vault-helper` bootstrap plugin into the archived copy, so the vault commits nothing under `.obsidian/plugins/` and none of the four `app.json` settings the library owns.

Only the `odu` presets get one: `standalone` has no release flow to do the injecting, so its vault would never reach a release — and the root README's `## Demo vault` section is omitted there for the same reason.

Two suites guard it, both emitted only when the preset is `odu` AND the test runner is vitest (both are vitest suites): `registerDemoVaultCoverageSuite` reads the notes without launching Obsidian, and `registerDemoVaultButtonSuite` clicks every button in a real one. The button suite needs `demo-vault/` opened in Obsidian once so CodeScript Toolkit installs — see the generated `CONTRIBUTING.md`.

### Root configs are thin wrappers

All actual logic lives in `scripts/`. Root config files (`eslint.config.mts`, `commitlint.config.ts`, `vitest.config.ts`) are minimal re-exports from `scripts/`. Root `package.json` scripts all use `jiti scripts/*.ts`.

### addScript single-arg convention

`addScript(name)` defaults to `jiti scripts/{name.replaceAll(':', '-')}.ts`. Each npm script maps 1:1 to a script file. Only pass a second arg for non-standard commands.

### Dependency versions are resolved at generation time

`addPackage(name)` records no version. `resolveVersions()` (`src/versions.ts`) fills one in per package:
an explicit `addPackage(name, version)` wins, then the pin table, then `^<current latest>` from
`registry.npmjs.org`; a failed lookup falls back to the literal `latest` so generating offline works.

The pin table is the single source for three things — the exact spec written into `devDependencies`, the
generated project's `overrides` block (npm's `$<name>` shorthand, only for pins that must also reach
nested copies), and its `pinned-versions.json` (G100). A pin's `check` is emitted only when the package it
reads from is in the project; otherwise its `manualCheck` is, so the file never carries a command that
cannot run. Two of the pins are load-bearing: `typescript@latest` is outside typescript-eslint's peer
range, and `@codemirror/*` must match Obsidian's exact peers.

`copyTemplates` takes the resolved map as an optional argument and stays synchronous — the rendering tests
call it ~60 times and must not touch the network.

`ADVISORY_OVERRIDES` is a **second, separate** table for overrides that exist only to clear an npm audit
advisory in a package the project never declares. The pin table cannot express those: there is no
declared spec for npm's `$<name>` shorthand to reuse. Each entry names the direct dependency whose
subtree carries the advisory, so `standalone` — which never reaches webdriverio and audits clean on its
own — gets none of them, and each still emits a `pinned-versions.json` entry with a runnable check.

### `minAppVersion` is fetched, not hardcoded — from the same place the release flow reads it

The manifest's `minAppVersion` comes from `desktop-releases.json` in `obsidianmd/obsidian-releases`, which
is exactly what `obsidian-dev-utils/script-utils/version` reads when it stamps the field on a release. Same
source at both ends means the scaffold and the project's first `npm run version` never disagree about where
the number comes from. `versions.json` ships the matching `"0.0.0": "<minAppVersion>"` entry rather than
`{}` — it maps each released version to the app version it needs, so an empty one is not a smaller version
of that, it is a different (wrong) claim.

Like the dependency versions, it is resolved in `main.ts` and handed to `copyTemplates`, which stays
synchronous. An offline generation falls back to `0.0.0` — no minimum, which is honest — rather than
inventing a number.

### The default branch is one answer, used twice

`git init -b <defaultBranch>` and the CI workflow's `branches:` trigger both read `answers.defaultBranch`.
They have to: the branch the repo is created on and the branch CI watches are the same thing, and when they
were independent (a bare `git init` taking `init.defaultBranch`, a workflow hardcoding `master`) the result
was a generated project whose CI never fired. `migrateAnswers` fills the answer in as `master` for projects
generated before it existed — that is what leaves their `ci.yml` byte-identical, so an update reports no
change instead of silently retargeting their CI.

### A list that partials would end with a trailing comma belongs on the builder

A partial can only emit `'<item>',`, so the last one always leaves a trailing comma — which the formatter
config strips, meaning the generated file fails its own `format:check`. Anything shaped like a list is
therefore collected on `TemplateBuilder` and rendered with a `forEach` that knows which element is last:
`addScript`, `addPackage`, `addLintStagedCommand`, `addSentenceCaseBrand`. Partials stay for content that
is a block, not an item.

### addFiles uses array syntax, no .ejs suffix

`addFiles(['file1', 'file2'])` — registered paths never include `.ejs`. Resolution happens at template level: check `{path}.ejs` on disk, or auto-render from partials.

### Partial template composition

- `_` in filename basename = partial (skipped in main render loop)
- `render(section)` auto-discovers partials by convention: `{basePath}_{section}_{partial}.ejs` — always use a section name
- `buildTemplate()` auto-adds each feature option's `partialName` as a partial after `configure()`
- Virtual templates: if no file exists on disk, `render()` composes from partials

**Partial names are one flat namespace, shared across every question.** `partialName` defaults to the
option's `settingValue`, which is right until two registries use the same value — `biome` answers both
`linter` and `formatter`. Choosing it for one pulled in the other's partials, so `scripts/lint.ts` came
out as the eslint script with the biome one concatenated onto it (`TS2300`), and `ci.yml` got its lint
step twice. A section name does not help: `render('tool')` still iterates every partial. The two biome
options therefore set `partialName: 'biome-formatter'` / `'biome-linter'` explicitly. Any future option
whose value collides needs the same.

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
- Tests with vitest, co-located next to the source they test — `foo.ts` → `foo.test.ts` (G10h); no `__tests__/` or `test/` directories
