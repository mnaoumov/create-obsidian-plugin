# AGENTS.md

## Project Overview

`@mnaoumov/create-obsidian-plugin` — an npm scaffolding CLI that generates Obsidian plugin projects from modern templates. Uses EJS for templating with a partial-based composition system.

## Architecture

- `src/` — Core generator logic (TemplateBuilder, features, prompts, templates), with the vitest unit tests co-located as `foo.test.ts` beside what they test
- `src/features/` — One kebab-case directory per question (`preset/`, `bundler/`, `ui-framework/`, `linter/`, `formatter/`, `test-runner/`, `styling/`, …), each holding one file per answer plus an `index.ts` exporting its options array. `FEATURE_REGISTRIES` in `src/templates.ts` is the list of them, and its order is the order partials are concatenated in.
- `templates/default/` — EJS template files (all must have `.ejs` extension), plus the one declared exception: a file whose extension is in `ASSET_EXTENSIONS` carries no `.ejs` and is copied byte for byte (see "One template is not EJS")
- `scripts/` — All build/lint/test logic lives here
- `dist/` — Built output (published to npm, not tracked in git)
- `plugin-drift-baseline.json` — the differences between the emitted dev-utils presets and the real plugins that are deliberate, each with the reason it is (see the fourth-check section below)

## Design Decisions

### No obsidian ecosystem dependencies in the generator

The generator project itself must NOT depend on `obsidian`, `obsidian-typings`, or `obsidian-dev-utils`. These are only used in the *generated* plugin projects.

### Two-tier script strategy

- **Enhanced/demo presets**: thin wrapper scripts that call the matching `obsidian-dev-utils` module — `script-utils/bundlers/esbuild`, `script-utils/linters/eslint`, `script-utils/test-runners/vitest`, `script-utils/version`, and so on, each wrapped in `wrapCliTask`. Updates propagate via `npm update`. There is no `script-utils/commands` barrel; every command has its own module.
- **Standalone preset**: fully inlined self-contained scripts with no obsidian-dev-utils dependency.

The ESLint *config* follows the same split. The dev-utils presets wrap `defineEslintConfigs` in `scripts/eslint-config.ts`, and `standalone` inlines its config in the root `eslint.config.mts`. See "Root configs are thin wrappers".

**Four scripts are the documented exceptions: they split on the TOOL first, not the preset.**

`build.ts` and `dev.ts` split on the **bundler**, and they must stay the same decision made once —
`dev` is `build` in watch mode. Splitting on the preset first is what made every dev-utils preset run
esbuild whatever was answered, while still installing the chosen bundler and emitting its config for
nothing to read. `build.ts` was fixed in `9fe2d67` and `dev.ts` was left behind, which is exactly how
the two came to disagree: `npm run build` ran webpack, `npm run dev` ran esbuild, both green.

Under each, only esbuild splits again by preset — obsidian-dev-utils supplies a build and a watcher
for it, standalone writes its own inline — and the four command-line bundlers share one script. On the
`dev` side that shared script is two lines: `build.ts` already reads `dev` off `process.argv` and
derives the watch flag, `dist/dev`, sourcemaps, the `.hotreload` marker and the vault copy from it, so
`dev` re-enters it rather than restating any of that.

**Standalone deliberately does not gain obsidian-dev-utils' `dev()` behavior.** That `dev()` is not
just a watcher: it also watches `node_modules` recursively and, on a change, disposes the esbuild
context and re-runs the whole pipeline including `build:compile`. That exists to compensate for
dev-utils' own `build:compile` step, which standalone has not got — and standalone's premise is a
self-contained script with no dev-utils. Porting it would buy ~25 lines of debounced fs watching and
process restart for no equivalent benefit. That was asked and answered; do not re-open it.

The two format scripts split on the **formatter** for the same class of reason.
What `npm run format` runs is decided by the formatter answer, and only dprint has a preset-specific
runner (dev-utils resolves `dprint.json` from the repo root and falls back to its bundled copy).
prettier and biome are a plain `execSync`, identical everywhere, so they are one file each shared by
every preset. Splitting on the preset first is what let the dev-utils half import the dprint runner whatever
was chosen — installing prettier or biome, emitting its config, then running dprint over it, with
dprint not even a dependency.

### The chosen formatter runs once at generation time

The templates are authored in one style, the real plugins'. dprint is configured to match it; prettier and
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
hands it to `@rollup/plugin-typescript`, and the dev-utils presets run `buildCompileTypeScript` over it. Putting an
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

### Three preset partials: `dev-utils`, `enhanced`, `demo`

`enhanced` and `demo` both build on `obsidian-dev-utils`, so they both contribute the **`dev-utils`** partial for what they share (the `scripts/`, `tsconfig.json`, the styles, the framework components and views, the README preset section).

They must NOT share a partial for anything either one overrides. A registered file with no `.ejs` on disk is composed by concatenating EVERY matching partial, so a file with both an `_enhanced` and a `_demo` whole-file partial would be emitted twice over — which is exactly what happened while `Demo.configure` also added `enhanced`. `src/plugin.ts_enhanced*` and the three `plugin-settings*_enhanced` files therefore stay keyed on `enhanced`, which only that preset carries.

### The obsidian-dev-utils presets ship a demo vault

`demo-vault/` is the generated plugin's documentation: notes that explain each feature and demonstrate it with `code-button`s run by CodeScript Toolkit. `obsidian-dev-utils` archives it into the GitHub release and injects the built plugin plus the `demo-vault-helper` bootstrap plugin into the archived copy, so the vault commits nothing under `.obsidian/plugins/` and none of the four `app.json` settings the library owns.

Only the `dev-utils` presets get one: `standalone` has no release flow to do the injecting, so its vault would never reach a release — and the root README's `## Demo vault` section is omitted there for the same reason.

A note that only some answers need is registered by that answer's `configure` behind `isDevUtilsPreset`, and reaches the vault through seams rather than conditionals: `00 Start.md` renders a `features` section inside its `## Features` table (the coverage suite fails a note `00 Start.md` does not reach), and `01 Sample commands.md` and `demoSetup.ts` each render a `commands` section. `wasm` is the one user today, with `03 WebAssembly.md`. Each seam renders nothing on a project that did not answer for it.

Two suites guard it, both emitted only when the preset is `dev-utils` AND the test runner is vitest (both are vitest suites): `registerDemoVaultCoverageSuite` reads the notes without launching Obsidian, and `registerDemoVaultButtonSuite` clicks every button in a real one. The button suite needs `demo-vault/` opened in Obsidian once so CodeScript Toolkit installs — see the generated `CONTRIBUTING.md`.

### Unit tests import the plugin, which is what forces every piece of the mock wiring

The emitted `src/plugin.test.ts` imports `./plugin.ts` and asserts the class extends Obsidian's `Plugin`.
It used to import nothing and assert `1 + 1 === 2`, which passed on every combination while proving
nothing — the gate tier's non-zero collected-test count only means something once the sample test
actually loads the code under test. Everything below exists because that import has to work; none of it
is optional decoration, and each piece was found by a combination that failed without it.

- **`obsidian` is types-only** (`"main": ""`, a tarball of `.d.ts` files), so it must be aliased to
  `obsidian-test-mocks/obsidian` in every runner. The dev-utils presets get that free from
  `defineObsidianPluginVitestConfig`'s `unit-tests` project; `standalone`'s own `vitest.config.ts` and
  `jest.config.ts` declare it themselves. `obsidian-test-mocks` is therefore added by the **test-runner**
  answer, not the preset — `standalone`'s premise is "no obsidian-dev-utils", which this does not breach,
  and a project on `testRunner: 'none'` gets none of it.
- **The alias is not enough on its own for vitest, and the setup file is not enough either.**
  `obsidian-test-mocks/vitest-setup` calls `vi.mock('obsidian')`, but vite has to *resolve* the specifier
  before the mock is consulted. Both halves ship.
- **jsdom, not node.** `obsidian-test-mocks`' `setup()` writes to `Document.prototype`,
  `Element.prototype` and `window`. Jest needs `jest-environment-jsdom` installed by name.
- **Single-file components are stubbed, not compiled** (`scripts/framework-component-stub.ts`).
  Compiling a `.svelte` / `.vue` needs a plugin that is a dependency only of the chosen bundler, and
  `preset: demo` imports the svelte view from `plugin.ts` **unconditionally**, so this is not a
  svelte-answer-only concern. The mapping is emitted for every jest project and every dev-utils vitest project
  rather than through partials: the pattern does not depend on any answer, which keeps the two configs
  identical across the matrix and avoids the partial-built-list trailing comma trap below.
- **A vite alias built from a RegExp replaces only what the pattern MATCHED.** `/\.svelte$/` rewrites the
  extension and leaves the rest of the specifier glued to the front of the replacement path — a failure
  that reports as "Failed to resolve import … Does the file exist?" on a file that plainly does. Hence
  `^.+` in `scripts/vitest-config.ts`. It is set through `editContext`, which hands over the live
  `unitTests` object; `test.alias` works there, and project-level `resolve.alias` is not reachable from
  that seam.
- **jest additionally stubs the whole `svelte` package.** Svelte reaches its own runtime through Node
  subpath imports (`#client/constants`), and jest's ESM resolver hands back the *types* entry for those,
  so any suite that loads svelte dies on a missing `COMMENT_NODE` export before it runs. The stub exports
  the `mount` / `unmount` the generated view uses; another `svelte` import needs adding there. Vitest
  resolves the subpath imports correctly and stubs only the component.
- **Solid needs a JSX runtime in both runners.** Its tsconfig sets `jsx: 'preserve'` for
  `babel-preset-solid`, which ts-jest emits untouched (`Unexpected token '<'`) and vite refuses to parse
  at all. Both configs override it to the automatic runtime from **`solid-js/h`** — the entry point that
  publishes a `jsx-runtime`; plain `solid-js` does not. These two are per-answer and so DO go through
  partials (`jest.config.ts@ts-jest-tsconfig_solid`, `vitest.config.ts_standalone@jsx_solid`,
  `scripts/vitest-config.ts@post-config_solid`).
- **Stylesheets are stubbed in every runner** (`scripts/stylesheet-stub.ts`), because `src/main.test.ts`
  imports `src/main.ts`, which imports the stylesheet. Jest parses a `.css` as JavaScript, and on
  `tailwind` the file `main.ts` names does not exist until the first build, so `npm test` on a fresh
  clone would fail to resolve it under vitest too.

### The sample unit tests ship; the screenshot and integration harness does not

Beside `src/plugin.test.ts`, `src/features/test-runner/sample-unit-tests.ts` registers the sample tests
the real plugins carry, and only those with something true to assert: `src/main.test.ts` on every preset
(the default export Obsidian loads is the plugin class), `src/plugin-settings-component.test.ts` on the
dev-utils presets (driven through `loadWithPromises()`, the lifecycle Obsidian runs), and
`src/plugin-settings.test.ts` on `demo` only. `enhanced`'s settings class is one default value, and a
test of it would only restate the source. There is no settings-tab test: rendering a row reaches `bind`,
which throws on the test-mocks components unless spied on, and jest under ES modules has no `jest`
global to spy with. The per-runner difference is only the `vitest` import, which each template takes
from a `test-imports` section.

The screenshot-capture harness, its images and the desktop / Android integration suites are left out
on purpose, for the reason `test:integration` already declines to run those projects: they need a
provisioned Obsidian or emulator, so a fresh project would ship tests nothing can run.
`plugin-drift-baseline.json` records that per entry.

### Root configs are thin wrappers

All actual logic lives in `scripts/`. Root config files (`eslint.config.mts`, `commitlint.config.ts`, `vitest.config.ts`) are minimal re-exports from `scripts/`. Root `package.json` scripts all use `jiti scripts/*.ts`.

The one exception is `standalone`'s `eslint.config.mts`, which inlines the whole config. That preset may not depend on anything from the ecosystem, so it has no shared config to wrap. The dev-utils presets emit a one-line root `eslint.config.mts` that re-exports `scripts/eslint-config.ts`, and that file wraps obsidian-dev-utils' `defineEslintConfigs` the way every real plugin does.

`scripts/markdownlint-cli2-config.ts` splits the same way. The dev-utils presets spread obsidian-dev-utils' `obsidianDevUtilsConfig` and turn `no-soft-break-in-paragraph` on, byte for byte what the real plugins carry; `standalone` inlines its rules and is the only preset that declares `markdownlint` and `markdownlint-rule-relative-links`.

**The shared config is much stricter than the inlined one.** It adds unicorn, perfectionist, `@stylistic`, import-x, eslint-comments and obsidian-dev-utils' own rules, and the templates are written to pass it. A sample that is red under its own `npm run lint` means the project has not really adopted the config. Two things were structural:

- **Sample views `return super.onOpen()` / `super.onClose()`** rather than `await Promise.resolve()`. The shared config's `prefer-noop-async` rejects the latter, and its fleet answer, `noopAsync()`, cannot be imported on `standalone`, which shares three of the view templates.
- **`sortImports(text)`** (`src/templates.ts`) re-sorts an import group whose lines come from per-answer partials. Partials contribute in question-registration order, which `perfectionist/sort-imports` rejects. A run of `//` comment lines directly above an import moves with that import, so an `eslint-disable-next-line` stays on the line it was written for.

`scripts/eslint-config.ts` re-states four things the shared config does not carry: `dot-notation` with `allowIndexSignaturePropertyAccess` (see "Where the linters and the compiler disagree"), `depend/ban-dependencies` allowing `moment`, the `sentence-case` brands, and the global ignores that `.gitignore` does not cover. It does not re-state the `no-console` / `no-nodejs-modules` exemption outside `src/`. The shared config scopes every obsidianmd rule to `context.sourceFiles`, so those rules never reach `scripts/`.

It also carries three categorical exemptions, so that no template needs an inline directive for them. `import-x/no-default-export` is off for `**/*.d.ts`, the three `scripts/*-stub.ts` and typesafe-i18n's locale files, because each of those has its default export dictated from outside. `import-x/no-unresolved` ignores `data-url:` and the generated tailwind stylesheet. The stylesheet does not exist until the first build, so an inline disable would be wrong both before the build and after it. `import-x/no-rename-default` is off for `scripts/rollup.config.ts`, where every plugin is imported as `<name>Module` for `asPluginFactory` to unwrap and which plugins are imported depends on the answers.

### A lint directive for the shared config goes in an `_dev-utils` section

Most templates are shared by all three presets, but only the dev-utils presets load import-x, unicorn, perfectionist and the other plugins the shared config registers. On `standalone`, a directive naming one of those rules is `Definition for rule ... was not found`, which is an error. A directive for a core rule that only the shared config enables, such as `no-void`, is an unused directive there, which is also an error. So such a directive is written as `<%- render('lint-<what>') -%>` and lives in `<template>@lint-<what>_dev-utils.ejs`. The `dev-utils` partial is carried by both dev-utils presets and by nothing else. Inside a JavaScript template literal (the `sortImports` blocks, rollup's plugin list) the same section is `${render('lint-<what>')}`.

Two options come before adding a section: change the code so that neither config complains, or exempt a whole category in `scripts/eslint-config.ts`. The wasm sample's command callback became `async` for the first reason, and i18next's `init` / `t` became named imports for the same reason. A foreign member name (`outDir`, `rootDir`, `emptyOutDir`) stays an inline disable, which is what obsidian-dev-utils' own source does for `unicorn/name-replacements`. The render tier's `foreign-lint-directive` check catches a directive written straight into a shared template.

### addScript single-arg convention

`addScript(name)` defaults to `jiti scripts/{name.replaceAll(':', '-')}.ts`. Each npm script maps 1:1 to a script file. Only pass a second arg for non-standard commands.

### Dependency versions are resolved at generation time

`addPackage(name)` records no version. `resolveVersions()` (`src/versions.ts`) fills one in per package:
an explicit `addPackage(name, version)` wins, then the pin table, then `^<current latest>` from
`registry.npmjs.org`; a failed lookup falls back to the literal `latest` so generating offline works.

The pin table is the single source for three things — the exact spec written into `devDependencies`, the
generated project's `overrides` block (npm's `$<name>` shorthand, only for pins that must also reach
nested copies), and its `pinned-versions.json`. A pin's `check` is emitted only when the package it
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
`addScript`, `addPackage`, `addLintStagedCommand`, `addSentenceCaseBrand`, `addDepcheckIgnore`. Partials stay for content that
is a block, not an item.

### The pre-commit hook follows the staged-files commands, not the commit-linting answer

`.husky/pre-commit` plus nano-staged is about staged FILES, and `.husky/commit-msg` plus commitlint is about
commit MESSAGES. So `conventional-commits` owns only the second. `buildTemplate` adds the first
(`addStagedFilesHook`, `src/features/git-hooks.ts`) after every answer and demo override has configured, and
only when `lintStagedPatterns` is non-empty. That means the hook exists exactly when a tool registered a
command for it, and it can never run an empty `nano-staged-config.ts`. Both hooks share `addHusky` (husky,
`prepare`, `scripts/prepare.ts`). A project with no linter, formatter, markdown linter and no commit linting
gets no husky at all. The real plugins beside this repo split the same way: all of them run nano-staged, and
only some also run commitlint.

### `npm run gate` is emitted only where it can pass

`scripts/gate.ts` is the one-line wrapper over obsidian-dev-utils' `gate()` that every real plugin ships
byte for byte: the release preflight's checks, reachable before committing. `gate()` runs `format:check`,
`spellcheck`, `lint:md`, `build` and `lint` through `npmRun`, which throws on a script the project does not
define, so on a project that answered `none` for any of those tools it dies on its first step.

So `addBranchGate` (`src/features/branch-gate.ts`) runs after every answer and demo override, like the
pre-commit hook, and registers the script, the file and the `has-gate` partial (its `CONTRIBUTING.md`
line) only on a dev-utils preset whose builder holds all five scripts. It reads the registered scripts, not the
answers: `demo` forces the linter, markdown linter and spell checker back in, so there only the formatter
can take the gate away. The emitted `version` script calls the same `gate()` as its preflight, so it
fails the same way on such a project; that is obsidian-dev-utils' to fix, and once it treats those steps as
optional the condition here can go.

### The emitted `cspell.json` knows every word the scaffold writes

`gate()` and the emitted `version` both run `spellcheck` first, so one unknown word in a template leaves
a fresh project red on its own release preflight. The gate tier's `spellcheck` step runs it. The word
list is one static list, like the framework names already in it, not a per-answer one: a word no file
of this project uses costs nothing, and a missing one fails the project. GitHub advisory ids
(`GHSA-xxxx-xxxx-xxxx`) are skipped by `ignoreRegExpList` rather than listed, because their fragments are
random and change with every advisory `pinned-versions.json` cites. The list was measured by rendering
one case per answer value under each preset and running cspell over all of them, which takes a minute.
Do that again after adding prose to a template.

### `.depcheckrc.json` is emitted, measured; `AGENTS.md` is not

Every real plugin carries both. They split because only one is derivable from the answers.

`.depcheckrc.json` lists the declared packages depcheck reports as unused although they are not — a
CLI run from a script, a loader or preset named as a string in a config, a compiler option. Each is
registered by `addDepcheckIgnore(name, reason)` **beside the `addPackage` that declares it**, so an
ignore exists exactly when its package does (`src/templates.test.ts` asserts that over every value of
every question under each preset), and the file writes one reason line per entry. Once the file exists,
a dependency sweep treats anything depcheck still reports as a failure, so an entry is added only for a
package that IS used where depcheck cannot see it — never to quiet a package nothing uses. The list was
measured, not copied: generate and install a case, run `npx depcheck` in it, and read what is left.
The same measurement decides what is declared at all: a package depcheck reports and nothing in the
project reaches is removed from that path, not ignored. So on the dev-utils presets' esbuild build, where
obsidian-dev-utils depends on and registers its own copies, `esbuild-sass-plugin`, `esbuild-svelte` and
`svelte-preprocess` are not declared. `svelte-preprocess` is also declared only on the bundlers whose
config imports it. `svelte-check` looks like the same case and is not: obsidian-dev-utils' `build:compile`
refuses to build a project with `.svelte` files unless package.json declares it, so it stays declared
everywhere and is ignored with that reason. `type-fest` and `@codemirror/language` are declared nowhere, because no
template imports either one.

`AGENTS.md` is not emitted. A scaffolded one could only restate the README about a codebase nobody has
written yet, and it is a maintained file from the moment it exists — a stub is confidently empty where
an absent file is honestly absent. `plugin-drift-baseline.json` records that under both dev-utils presets.

### linkinator skips the plugin's own repository, and nothing else

`lint:md` runs linkinator over every Markdown file, and the README and demo vault link to
`https://github.com/<author>/obsidian-<id>` and its `/releases`. Those links 404 until the user creates and
pushes the repository and cuts a release, so without a skip a fresh project fails its own `lint:md`, `gate` and
`version` for a reason nothing local can fix. The markdownlint answer therefore emits `linkinator.config.json`
under every preset. Both presets' `lint:md` run linkinator from the project root with no `--config` or `--skip`,
and linkinator reads that file by default and merges it under its flags. Its one `skip` pattern
(`getOwnRepoLinkPattern`, `src/templates.ts`) is anchored, so the BRAT install link that carries the repo URL in
its query is still checked. The author's profile link stays checked too, because it exists for a real author
and is what catches a mistyped GitHub name. No tier runs `lint:md`: it needs the network, and the fixture author
`testuser` has no GitHub profile.

### A line that is not really per-answer gets ONE partial, named for what it is

The sibling of the trailing-comma rule, and the more dangerous one. Writing the same line into one
partial per answer looks harmless while only one answer can be active — and then a preset forces a
**second** answer in the same question (`demo` does, with `scss` for styling and react for uiFramework)
and both copies render into one file. That is a duplicate declaration, not a duplicate line: TS2300 for
an import, TS2451 for a `const`.

So a line every answer needs is contributed by every answer that needs it, through one partial named
for the line rather than for any answer — `webpack-css-extract`, `rollup-babel`, `has-e2e`. `partials`
is a `Set`, so it renders exactly once however many answers asked for it. Where the per-answer
contributions genuinely differ (each framework's babel presets, each styling answer's webpack `rule`),
they stay per-answer; only what is identical is hoisted. `scripts/babel.config.ts` shows the third
shape: three whole-file partials each declaring `export const config` became one file composed from
`babel-preset` and `babel-plugin` list sections.

`render-checks.ts` carries this as `duplicate-declaration`, which is what found the `babel.config.ts`
case — the install tier's 56 cases never reach it. Its JSON twin is `duplicate-json-key`: `JSON.parse`
accepts a repeated key silently and keeps the last, so `invalid-json` cannot see the same failure in a
`.json` file.

### The demo preset forces a second answer — except where the project can only hold one

`DEMO_OVERRIDES` (`src/templates.ts`) is what makes the demo vault show every feature: where the chosen
answer differs from the demo value, the demo value is configured *as well*. It works because almost
everything a feature contributes is additive — another partial, another package, another sample file.

The exception is a setting that is a property of the *project* rather than of a file, and the JSX runtime
is the one such setting today. `jsx` / `jsxImportSource` are compiler options, global twice over: once in
`tsconfig.json`, once more in whichever bundler config was chosen (`build.ts@bundler_esbuild@options_*`
writes them directly, `rollup.config.ts@post-plugin_*` a whole `babel({...})` block, `vite.config.ts` a
plugin). A per-file `/** @jsxImportSource */` pragma does not rescue it, because the bundler half is
global by construction. So a generated project demonstrates exactly ONE JSX runtime.

`FeatureOption.jsxImportSource` records which options claim one — `react`, `preact`, `solid` — and
`buildTemplate` skips a demo override that claims a different one from the chosen answer. **The explicit
answer wins**, which is the same call the demo + biome linter case makes. `svelte` and `vue` compile their
own single-file components and `lit` uses tagged templates, so none of them claims a runtime and all three
stay forced beside anything. Note this changes nothing a user can reach: `src/prompts.ts` skips the
`uiFramework` question for `preset: demo` and pins it to `none`, so the demo vault still gets react,
svelte and vue. It is `buildTemplate` that had to stop emitting a project that cannot compile.

### An answer can arrive from four places, and the most specific wins

`src/cli-args.ts` parses `--<answerKey>=<value>` and `--answersFile=<json>`; `src/answers-export.ts` writes both forms back out. The order is built-in defaults, then the answers saved in an existing project, then the answers file, then individual flags.

Three things about it are load-bearing.

**The accepted values come from `ANSWER_SPACE`, not from a list in the CLI.** That is derived from the `*_OPTIONS` arrays, so an option added to a feature is settable the day it lands. The answerable KEYS are read off a real `Answers` object (`Object.keys(getDefaultAnswers())`) for the same reason — TypeScript forces that object to carry every key, so the derivation is total. `src/cli-args.test.ts` asserts every key is either answerable or explicitly computed, which is the `platformSupport` defect class again: a question the user is asked whose answer is then discarded.

**Only the `skip` predicate needed composing.** `runPromptSteps` already writes `defaultValue(answers)` for a skipped step, and every step's `defaultValue` already reads the supplied answer before its own fallback — so a supplied answer lands by the path that was already there. This is why the 19 `skipUnlessCustomize` steps honour a flag even under `preset: demo`, where they are all skipped.

**`preset=demo` with `--bundler` or `--uiFramework` is refused, not pinned.** Those two are the only steps whose `defaultValue` discards the supplied answer (`answers.get('preset') === 'demo' ? '<literal>' : (supplied ?? '<literal>')`). Accepting the flag and dropping it would be bad; honouring it would be worse — the section above records that demo emits a project that cannot build when a second JSX runtime is forced in, closed on the grounds that the combination is unreachable from every CLI path. A flag reaching it would re-open that. For the same reason the exporter omits both keys under demo, so what it writes is always something the parser accepts.

The exported script is runnable rather than copyable text, which makes quoting per-shell: `sh` gets single quotes with `'\''` for an embedded one, `cmd` gets double quotes with `""` — **and a literal `%` doubled to `%%`, because a batch file expands `%…%` as a variable**. Funding and badge URLs are percent-encoded, so that is a real value, not a hypothetical. `cmd`'s `^` line continuation is silently broken by one trailing space, so the batch form stays on a single line and only the shell form wraps. The tests generate BOTH forms whatever the host runs and parse them back through the real parser; the quoting was additionally executed through actual `cmd.exe` and actual `sh`.

### `--yes` never asks: a question no flag answers stops the run

`--yes` is what an exported script runs, and a script has no TTY, so a `confirm()` reached under it waits
forever. Two prompts sit outside the answer space. Each has its own flag: `--mode=create|update` answers
"Existing project detected, update it?" and `--force` answers "Directory already exists, continue?".
Under `--yes`, reaching either without its flag is a usage error that names the flag (`exitWithUsageError`,
`src/main.ts`). It does not take the prompt's default. A silent "no" at the directory check exits 0
having generated nothing, and a silent guess at mode detection may update a project the caller meant to
leave alone. On update, `--yes` skips "change any settings?" and uses the saved answers with the flags over
them. It refuses a config that records no answers, because using the defaults there would mean guessing
the plugin id of a project that already exists. The exporter writes `--yes --mode=create`, so a recipe
run inside an existing project still creates a new plugin.

A new `confirm()` on a path `--yes` can reach needs the same treatment: a flag, or a refusal.

### A hand-edited file is skipped on every update, not just the next one

`.create-obsidian-plugin.json` records, per file, the hash of what the generator WROTE. On an update a file
whose content matches neither that hash nor the new render is the user's, so it is skipped with a warning and
the generator's hash is carried forward unchanged. It must not record the user's hash instead: the next update
would then find the file matching its record, take it as untouched, and overwrite it under "Updated". That was
the code until `copyTemplates` was fixed, so the protection lasted exactly one update. A skipped file rejoins
updates when its content matches a render again, or when the user deletes it. `src/templates.test.ts` drives
three updates over one edit to pin this.

A file at a path with NO recorded hash is the user's too, unless it already matches the render. That is a path
the previous run never emitted: a template new in this generator version, or an answer that now registers it.
Comparing only against a recorded hash let the update overwrite it under "Updated". It is skipped with the same
warning and no hash is recorded for it, so it stays skipped on later updates by the same two exits.

### A user's own templates are an overlay searched ahead of `templates/default`

`--customTemplate=<dir>` (`src/overlay.ts`) is for what the answers cannot say. The directory mirrors
`templates/default`, and `copyTemplates` resolves every template path through one `findTemplate` that looks
there first: whole files, partials at any depth and assets. So a template at a built-in's path replaces it, and it
uses the same grammar rather than a second one. `overlay.json` declares only what a path cannot carry:
`partials`, `files`, `packages` and `badges`. `buildTemplate(answers, overlay)` applies them LAST, after
every answer and demo override, so an overlay partial renders after the built-in ones at each seam and a badge
goes at the end of the line. An overlay sets no answers. It layers onto the output, so it is not a fifth rung of
the answer precedence above.

**The overlay is recorded in `.create-obsidian-plugin.json` as `customTemplate`, beside `answers`,** relative
to the project. `copyTemplates` compares each file on disk with the hash it recorded LAST time. So an overlay
dropped on the next run would not look user-modified. Every overlaid file would still match its hash and be
silently reverted to the built-in. An update therefore re-applies the recorded overlay, and one that has gone
missing is refused rather than skipped. `--customTemplate=` (empty) is the explicit way to drop it.
`src/overlay.test.ts` pins all three update outcomes.

**No tier covers an overlay, so it is held to a smaller contract at load time instead.** The four tiers sweep a
closed answer space, and an overlay is outside it by definition. The render tier also needs TypeScript, which is
a dev dependency, so it cannot run inside the published CLI. `loadOverlay` checks what can be checked without
rendering: every template it carries is reachable, a declared partial name is not a built-in one, and what it
declares exists. Reachable means a partial is declared or overrides a built-in partial file by path, a whole
file overrides a registrable built-in or is listed in `files`, and a section answers a `render()` site that
exists. The partial-name check matters because partial names are one flat namespace: `esbuild` declared by an
overlay would pull every esbuild partial into every project. An overlay template that fails EJS is an error.
The built-ins' fall-back of emitting the raw source would hide the user's mistake in the generated project.

An override of a file the answers do not register is deliberately NOT an error. It applies exactly when the
built-in it replaces is emitted, which is what lets one overlay serve several answer sets.

Deferred: an overlay published as an npm package (what would make one shareable), and `render:case` /
`gate:case` taking `--customTemplate`.

### The three manifest answers are checked against the Community directory, at the prompt

`src/directory-constraints.ts` holds what the directory's automated review enforces on `id`, `name` and
`description`. It is reached from two places and needs no third: the prompts pass each validator to clack,
and `cli-args.ts`'s `FREE_TEXT_VALIDATORS` is the same table, so a flag, an answers file, `render:case` and
`gate:case` are all held to it.

**Checking here is the only place the cost is zero.** The directory re-reads `manifest.json` at
default-branch HEAD, so a one-word correction found afterwards costs a version bump and a fresh release —
and an `id` costs more than that, because it can never be changed once the plugin is published.

**The constraint set is stated twice on purpose.** `obsidian-dev-utils` carries the same rules as four
ESLint checks over a repo's `manifest.json`, which is what catches an already-generated project. Sharing
one copy would mean a runtime dependency on an obsidian ecosystem package, which the section above
forbids, so the two are kept in step by hand. Change one and change the other.

**Two checks the obvious reading of the rules gets wrong**, both measured across the live listings:
a description may say `plugin` and may not refer to *itself* (`Enhances Note composer core plugin.` is
published and passed the review), and a description has no character whitelist — backticks, em dashes,
parentheses, colons and slashes are all live and unflagged, so only emoji are rejected. A third has the
opposite provenance: `Obsidian` is banned from a description by the review and by no Obsidian document.

**The generator's own answers have to pass too, and did not.** The default id was `my-awesome-plugin` and
the verification fixture `my-plugin`, both of which the directory rejects for ending with `plugin`; their
names carried `Plugin` for the same reason. So the `--yes` path shipped an unlistable plugin and every
verified case generated one. `src/directory-constraints.test.ts` asserts both sets pass, which is what
stops either drifting back.

**Uniqueness is the one constraint the prompt cannot check, so it is checked once the answers are in.**
The directory also requires the `id` to be absent from `community-plugins.json`, a fact about the world
that a synchronous clack `validate` cannot fetch. `src/directory-registry.ts` fetches the list, and
`ensurePluginIdIsUnlisted` (`src/main.ts`) checks it between the answers and the answers export, so an
exported script carries the corrected id. A failed fetch is a warning naming what went unchecked, never a
refusal, for the reason `resolveVersions()` falls back to `latest`. A collision under `--yes` is a usage
error naming `--pluginId`; interactively it asks for the id alone again, and also offers to keep it,
for the author of that listed plugin. An update checks only an id the run CHANGED, because a listed
plugin's own saved id matches itself.

### Three lists have to agree about which files are in the program

Typed ESLint rules need every file ESLint reaches to be in the tsconfig `include`, so the ESLint file
list, the emitted `tsconfig.json`'s `include`, and the set of files actually written have to say the
same thing. The ESLint file list is `typeScriptFiles` in `standalone`'s inlined `eslint.config.mts`, and
on the dev-utils presets it is obsidian-dev-utils' own context, which `scripts/eslint-config.ts` widens through
`editContext` — the root wrappers for jest, vite and webpack, and `e2e/`. `e2e/` was in neither list while
`obsidianmd.configs.recommended` still linted it, which is the whole of "You have used a rule which
requires type information" — the largest single class of install-tier failures. It reaches both lists
through the shared `has-e2e` partial, and only when an end-to-end runner was chosen.

Putting a directory into the program is not free: it starts being type-checked. That is what exposed
`wdio.conf.ts` never having compiled, and both sample specs asserting over `app.plugins` /
`app.commands` regardless of the `apiSubset` answer — so those assertions now sit behind an
`unofficial` section.

### Where the linters and the compiler disagree, the compiler wins

`@tsconfig/strictest` turns on `noPropertyAccessFromIndexSignature`, which the obsidian-dev-utils
presets inherit, and it REJECTS `process.env.BUILD`. ESLint's `dot-notation` and biome's
`useLiteralKeys` both ask for exactly that form. The compiler's complaint is an error and the linters'
is a preference, so `dot-notation` is configured with `allowIndexSignaturePropertyAccess` and
`useLiteralKeys` is turned off — each with the reason written where the rule is silenced, not here.

The biome config is `biome.jsonc` so it can carry those reasons. Biome parses its own config as JSONC
whatever the extension, but it rejects a `"//"` key as unknown, and real comments in a file named
`.json` would fail the render tier's JSON check. It also turns `noUnusedVariables` off for `.svelte`
and `.vue`, where biome reads the script block but not the markup and reports every binding the
template uses as unused.

### The PostCSS config must be named `postcss.config.cjs`, and Tailwind is v4

Two silent failures, stacked. Every consumer finds the config through `postcss-load-config`, and the
copy `esbuild-postcss` bundles is v3, whose search places stop at `postcss.config.cjs`. An `.mjs` name
matched nothing — and finding nothing is not an error there, it just runs with no plugins — so on
`standalone` + `esbuild` neither autoprefixer nor Tailwind had ever run, with the build green
throughout. `.cjs` is the one name every version of the loader, plus parcel, vite, webpack and rollup,
agree on; it still loads the real config from `scripts/postcss.config.ts` through jiti.

Tailwind is configured for **4**, which is what gets installed: the PostCSS plugin is
`@tailwindcss/postcss`, the stylesheet says `@import "tailwindcss"` rather than the three `@tailwind`
directives, and there is no JavaScript config at all — v4 detects its sources itself. `tailwindcss`'
own default export is now a stub that warns you reached for the wrong package, and its return type is
`void`, which is why the v3-shaped config failed `no-confusing-void-expression`. The lint error was the
compiler pointing at a real fault, not a style complaint.

### Every bundler has to be told to name the stylesheet `styles.css`

`src/main.ts` imports the stylesheet purely for its side effect, so the bundler emits one — that is what
every `src/main.ts@import_*.ejs` comment means by "if you want to have a styles.css file in your build
output". Obsidian loads a plugin's stylesheet from **`styles.css` and nothing else**, and no bundler
picks that name on its own. Three of the six paths shipped a stylesheet the app never opened, with a
green build the whole time:

| path | emitted before | what names it now |
| --- | --- | --- |
| webpack | `styles.css` | `MiniCssExtractPlugin({ filename: 'styles.css' })` — always did |
| rollup | `styles.css` (postcss); `assets/output-<hash>.css` (scss) | `postcss({ extract: … })` / `scss({ fileName: … })` — rollup-plugin-scss 4 ignores a string `output` |
| esbuild (dev-utils) | `styles.css` | obsidian-dev-utils' own `renameCssPlugin` — always did |
| esbuild (standalone) | `main.css` | a local `renameCssPlugin`; the CSS lands beside `outfile` |
| vite | `<pluginId>.css` | `build.lib.cssFileName`; lib mode names it after the package |
| parcel | `main.<hash>.css` | `parcel-namer-obsidian.cjs`; sibling bundles are content-hashed |

**Each fix is config-level, and a shared post-build rename would have been wrong.** `dev` runs the four
CLI bundlers under `--watch` (`build.ts@bundler_cli-bundler.ejs`), so a rename after `execSync` returns
fires once and never again on a rebuild — and `dist/dev` is copied wholesale into the vault, so the
name has to be right there too. The two esbuild paths use `build.onEnd`, which does run per rebuild;
the standalone one is registered **before** `copyToObsidianPluginsFolderPlugin`, since esbuild runs
`onEnd` callbacks in plugin order and the copy has to see the renamed file.

Parcel needed a second plugin file for the same reason it needed the first: every other bundler takes an
output name as an option, and Parcel takes a namer — as it takes a resolver where the others take an
`external` list.

**The gate tier asserts the artifact, not the exit code.** `npm run build` exiting 0 is what let this
live: `checkStyles` (`src/generated-project-checks.ts`) now runs after `build` and, when the emitted
`src/main.ts` imports a stylesheet, insists that `dist/build/styles.css` exists, is non-empty, and is
the only `.css` in the folder — the last clause being what catches a half-fix that writes `styles.css`
and leaves the misnamed original beside it. The trigger is read out of the generated `src/main.ts`
rather than from `answers.styling`, for the reason `runScriptStep` gives about scripts: `DEMO_OVERRIDES`
forces `styling: 'scss'` on the demo preset whatever was answered.

### Every bundler has to be told to INLINE the WebAssembly module into `main.js`

The stylesheet rule's twin, and it cost two of the five bundler plugins their place. `wasmSupport: wasm`
used to emit a `.d.ts`, a README telling the user to go build a module, and a bundler integration — and
**nothing that imported a `.wasm`**, so none of the five integrations had ever run. The answer now ships
one: `src/wasm/module.wasm`, 39 bytes, one export `answer()` returning 42, taken from CodeScript
Toolkit's demo vault, with its WAT source beside it as documentation and `src/wasm/answer.ts` loading it.

**Obsidian ships `main.js`, `styles.css` and `manifest.json` and nothing else.** A bundler that emits the
module as a separate `.wasm` produces a plugin that works in the repo and is broken everywhere it is
installed, with `npm run build` exiting 0 throughout. Three of the five did exactly that by default.

**And an Obsidian bundle is `cjs`, which rules out the WebAssembly/ESM-integration proposal entirely.**
Every plugin implementing it — `esbuild-plugin-wasm` and `vite-plugin-wasm`, both of which were installed
here — reaches the module through a **top-level `await`**, which esbuild supports only for `esm` output
and which vite needs `vite-plugin-top-level-await` for. Neither could ever have worked in a plugin, and
nothing said so because nothing imported a `.wasm`.

| bundler | emitted before | what inlines it now |
| --- | --- | --- |
| esbuild | `wasmLoader()`, deferred: a sibling `.wasm` fetched at runtime | esbuild's own `loader: { '.wasm': 'binary' }` — no plugin, no await |
| rollup | inlined under `maxFileSize`, by luck of the size | `wasm({ targetEnv: 'auto-inline' })` — always inlined, and no `fs` branch |
| vite | `vite-plugin-wasm` | `./module.wasm?url` plus `build.assetsInlineLimit` |
| webpack | `experiments.asyncWebAssembly`: a `.wasm` chunk | a `module.rules` entry with `type: 'asset/inline'` |
| parcel | native `.wasm` resolution: a sibling bundle | the `data-url:` scheme |

So the import yields something different under each — bytes, a loader function, or a `data:` URL — and
`src/wasm.d.ts` and `src/wasm/answer.ts` are therefore **per-bundler whole-file partials** behind one
signature, `getWasmAnswer(): Promise<number>`. Two details in there were each a compile error first:
`WebAssembly.Module` is declared as an EMPTY interface, so `WebAssembly.instantiate(bytes)` in one call
resolves to the already-compiled-module overload and returns a bare `Instance` (TS2339) — hence `compile`
then `instantiate`; and parcel percent-encodes its data URL payload, so `/` arrives as `%2F` and `atob`
throws without a `decodeURIComponent` first.

**Something has to CALL it.** A bundler tree-shakes an export nothing uses, so an unimported or unused
module drops out of the bundle with the build still green — which is the original defect wearing a
different hat. `src/wasm/sample-command.ts` registers a `Sample WASM answer` command, and all three
preset `plugin.ts` partials gained `import` / `onload` seams to reach it. The gate's `wasm` step asserts
the artifact rather than the exit code: no `.wasm` beside `main.js`, and the module's bytes present
inside it in one of the four encodings the five bundlers produce.

Both unit runners alias every `.wasm` import to `scripts/wasm-module-stub.ts`, exactly as they alias
`.svelte` / `.vue` to the component stub: the emitted `src/plugin.test.ts` imports `plugin.ts`, which now
reaches the module, and neither runner can load one — vitest fetches it from a dev-server URL that does
not exist, jest has no transform for the extension.

### The dev-utils presets pass their extra esbuild plugins through `customEsbuildPlugins`

obsidian-dev-utils' `build()` and `dev()` both accept `customEsbuildPlugins` and spread them into their
own plugin list. They already register a svelte wrapper and a sass plugin — which is exactly why svelte
and SCSS work on these presets untouched — but nothing for Vue, so `esbuild-plugin-vue3` was installed
and never wired in. `scripts/esbuild-plugins.ts` holds that list, emitted for the dev-utils presets when the
bundler is esbuild, and both `build.ts` and `dev.ts` pass it.

Both import it **unconditionally**, because both live under `@bundler_esbuild` where the answer is
guaranteed. `dev.ts` used to gate the import and the argument on the `esbuild` partial
(`dev.ts_dev-utils@import_esbuild`, `dev.ts_dev-utils@options_esbuild`) from a position where the bundler was
*not* yet decided — so on any other bundler that gate rendered a bare `dev()` with no plugin list at
all. A partial keyed on the answer its own branch already guarantees is a tautology in the good case
and a silent hole in the bad one.

### On rollup, a Vue SFC's TypeScript is stripped by a babel pass of its own

`rollup-plugin-vue` hands a `<script lang="ts">` block on as a virtual module (`…vue?vue&type=script…lang.ts`)
and compiles none of it, and `@rollup/plugin-typescript` compiles only files in the tsconfig program, which a
virtual module never is. So the vue answer on rollup adds a babel pass right after `vue()` carrying only
`@babel/preset-typescript`, scoped to those modules, with `configFile: false` so a JSX preset another
framework configures cannot reach them first. On `demo` it was exactly that react pass that died on the
TypeScript; on `enhanced` rollup's own parser did.

It stayed hidden because nothing imported the component: `plugin.ts_demo.ejs` registered only the react and
svelte views, and a bundler never compiles a module nothing reaches, so `demo` + rollup built green while
claiming Vue. A forced framework needs its view registered, which `src/templates.test.ts` now asserts.
`standalone` had the same hole for every framework: `plugin.ts_standalone.ejs` had no seam for a view, so
whichever framework was answered, its component was written and never compiled. It now registers the
answered view like `enhanced` does, and the same test covers both presets over every framework. The
`openViewOnLayoutReady` helper both need is one `ui-view` partial per preset, not one copy per framework.

### On rollup, the TypeScript plugin is handed a TypeScript that knows each file's module format

`@rollup/plugin-typescript` (12.3.0, the latest) asks `ts.getModeForResolutionAtIndex` for each import's
resolution mode without passing the compiler options, and TypeScript answers `undefined` without them. So the
plugin's program resolves every import in `src/` under the `require` condition, while tsc resolves them as
`import`. A dual package then loads twice: obsidian-dev-utils' `.d.cts` pins `@codemirror/state` with
`resolution-mode: import`, the sample's own import gets `index.d.cts`, and the codemirror sample's
`implements StateFieldSpec` printed TS2416 three times on every rollup build while plain tsc passed.
`scripts/rollup.config.ts` therefore passes the plugin's `typescript` option a copy of TypeScript whose
`getModeForResolutionAtIndex` supplies `module: Node16`. It is fixed there rather than in the sample, because
any user code that mixes obsidian-dev-utils' codemirror types with its own `@codemirror/*` imports meets the
same split. Turning the plugin's type check off was the other option and was refused: on `standalone` it is
the rollup build's only type check.

The same `typescript({...})` block also overrides `inlineSourceMap` / `inlineSources` to follow `isProduction`.
The emitted `tsconfig.json` inlines a source map, and a production build writes none, so every production build
warned that nothing would output the map. No tier fails on a build warning, so `src/templates.test.ts` is what
pins both fixes.

### addFiles uses array syntax, no .ejs suffix

`addFiles(['file1', 'file2'])` — registered paths never include `.ejs`. Resolution happens at template level: check `{path}.ejs` on disk, or auto-render from partials.

### One template is not EJS: an ASSET is copied byte for byte

`templates/default` is text with exactly one exception, and the exception is declared rather than
sniffed. `ASSET_EXTENSIONS` (`src/templates.ts`) lists the extensions whose template has **no `.ejs`
suffix** and is the emitted file verbatim; `.wasm` is the only member, for the sample WebAssembly module
the `wasm` answer ships. `copyTemplates` reads, hashes and writes those as a `Buffer` and skips EJS
entirely — the previous `readFileSync(path, 'utf-8')` would decode a binary and write it back destroyed.

Three other places had to learn about it, and each would otherwise have failed silently:

- **The plan tier.** `loadTemplateInventory` skips everything without `.ejs`, so a registered `.wasm`
  looked like a file with neither its own template nor any partial — `empty-emitted-file` on every case
  that registers it. It now collects `assetTemplates`, and carries the mirror check, `orphan-asset`: an
  asset no case registers is a binary in the tree that no generated project ever receives.
- **The render tier.** `checkFile` reads every emitted file as UTF-8, and a `.wasm` would pass its three
  text checks *by accident* — not empty, no `<%`, no `[object Object]`. Assets go to `checkAsset`
  instead, which runs `WebAssembly.validate` over the bytes (Node has one built in, so this costs no
  dependency) and reports `invalid-wasm`. That is the positive check the copy path exists to earn.
- **`.gitattributes`, in both repos.** `* text=auto eol=lf` leaves a binary to git's NUL-byte heuristic.
  It would very probably spare 39 bytes full of NULs — but "probably" is the wrong guarantee for a file
  a line-ending conversion silently destroys, so `*.wasm binary` is explicit in this repo and in what the
  generator emits.

A second asset kind is a matter of adding the extension to that set. A second *shape* of template is not:
anything that needs rendering is EJS.

### Partial template composition

- A template on disk is a partial when the tail after the LAST `_` in its basename (minus `.ejs`) is a partial name. Partial names are kebab-case, which `addPartial` enforces (`PARTIAL_NAME_PATTERN`), so a real filename keeps its underscores: `bug_report.yml.ejs` ends in `report.yml` and is a template of its own. `isPartialTemplatePath` (`src/templates.ts`) is the one classifier, and only on-disk paths are classified. A registered path is the emitted file's path and is never a partial. Reading any `_` as the marker used to skip `bug_report.yml` and `feature_request.yml` silently.
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

### Funding is one platform and one handle, and everything else is derived

`fundingPlatform` (`src/features/funding-platform/`) names one of the platforms GitHub's `FUNDING.yml` understands, or `none`, or `custom`. `fundingUsername` is the handle on it. Each option derives the URL, the one `FUNDING.yml` line and the shields.io badge from those two, so the manifest's `fundingUrl`, the README's badge and `## Support` link and `.github/FUNDING.yml` cannot disagree. The template context's `fundingUrl` is that derived URL, and it overrides the stored answer. The stored `fundingUrl` is read only under `custom`, the one platform with no handle, and it is prompted for only then. GitHub's four project-slug keys (`tidelift`, `community_bridge`, `issuehunt`, `lfx_crowdfunding`) are left to `custom`, because their value names a project rather than the author.

The platform is asked with the project details, not under Customize. It is a fact about the author, and choosing `none` there is the only opt-out the recommended-defaults path has.

Not always-include, not `<% if`. When `resolveFunding` finds a URL, `buildTemplate` registers `.github/FUNDING.yml`, the funding badge and the `has-funding` partial (`manifest.json@funding_has-funding.ejs`, `README.md@support_has-funding.ejs`). Before this, `FUNDING.yml` was GitHub's stock template with all 13 platforms blank, which GitHub renders as no funding at all. `migrateAnswers` turns an old project's `fundingUrl` into the platform and handle it names, turns any other URL into `custom`, and turns no URL into `none`.

### README badges are collected on the builder, not composed from partials

`addBadge` collects them and `README.md.ejs` joins them with a space on line 3, because they must stay on ONE source line (see the hard-wrapped markdown failure mode below). A `render('badges')` seam would end every partial in a newline. The order is the real plugins' order: funding, release, downloads, then the `coverageBadge` answer's `coverage: 100%` badge. `src/templates.test.ts` asserts that line byte for byte against the real plugins' line, which is what covers the content that `verify:plugin-drift` does not compare. `coverageBadge` defaults to `none`, because the badge is a claim drawn from a URL and not a measurement, and a fresh project does not hold 100% coverage. `PLUGIN_SHAPED_ANSWERS` sets it, as every real plugin does.

### Logicless templates

Templates must be logicless — no `<% if %>` conditionals. Use the partial system for conditional content. Loops (`<% for %>`) are acceptable for iterating data. All conditional logic is handled by which partials are included, not by branching in templates.

### `<%=` escapes for HTML, so it belongs only where the output is HTML

EJS's `<%=` HTML-escapes its value. That is right in a README's `<a href>` and wrong everywhere else: a funding URL with two query parameters reached `manifest.json` as `&amp;`, which Obsidian reads verbatim, and a free-text description with `&` or `"` did the same to `package.json`. So a JSON template writes a value as `<%- JSON.stringify(value) %>`, never inside quotes — `<%-` alone would leave a `"` or `\` to break the JSON. A plain-text file such as `.env` takes `<%-`. `src/templates.test.ts` fails any JSON template that interpolates inside a string literal.

### Three-tier answer-space verification

The generator asks 24 questions — 22 choices plus two presence branches (`fundingUrl` and
`obsidianConfigFolder`, on which `buildTemplate` contributes `has-funding` under `fundingPlatform: custom` and `has-vault-true`/`false`).
They multiply out to **150,493,593,600** combinations, so "test every combination" is not one job. It is
three, each covering as much as its per-case cost allows.

| tier | per case | what runs it | coverage it can afford |
| --- | --- | --- | --- |
| plan (`src/plan-checks.ts`) | ~32 us | strength-2 in `npm test`; `npm run verify:answer-space` | 5M-case stride sample + a strength-3 interaction pass, ~35 s |
| render (`src/render-checks.ts`) | ~215 ms | strength-2 in `npm test`; `npm run verify:rendering` | strength 3, 265 cases, ~40 s across processes |
| install and gate (`src/generated-project-checks.ts`) | minutes | `npm run verify:projects` | strength 2 under npm, ~50 cases, plus one case each for bun/pnpm/yarn |

None of them answers the question asked while actually editing a template — *what does this one
combination emit?* — because all three sweep. `npm run render:case -- <question>=<answer> …
--show=<paths>` (`scripts/render-one-case.ts`) renders exactly one case and prints the files named,
distinguishing "never emitted" from "emitted empty". Use it instead of writing another scratch
renderer; that habit is how a wrong transcript ended up quoted in a report.

`npm run gate:case -- <question>=<answer> … [--out=<dir>]` (`scripts/gate-one-case.ts`) is its
counterpart one tier down: it resolves versions, generates ONE case and runs the identical `runGate`
over it, in the minute or two one case costs rather than the hour `verify:projects` takes. That is the
tool for *does this combination actually build, and what did the bundler emit?* — the question asked
while changing a bundler's configuration, and the one the whole WebAssembly pass was driven from.

`--exhaustive` exists on the plan tier and is **not** the default: at the measured 32 us it is ~1340 hours
single-threaded and ~134 on ten workers, and the flag prints that projection before it starts.

**Six failure modes make a silent pass the default here, and every tier is shaped around them.**

1. **An unresolved partial renders as `''`, not an error.** A registered file whose partials were all
   left unresolved is written EMPTY — and an empty `.ts` compiles, an empty config reads as "no
   configuration", and every existence check on it passes. The plan tier catches it before rendering
   (`empty-emitted-file`); the render tier catches it in the bytes (`empty-file`).
2. **A test runner that collects nothing exits 0.** Jest and vitest both do, so the gate tier reads the
   collected test count out of the runner's summary and treats zero as a failure. It reads the `Tests`
   totals line with the color escapes stripped: both runners color it, and the escapes sit between
   the label and the count, which made every passing suite read as zero. The totals line is also the
   one vitest prints under its `minimal` reporter, which it picks by itself inside an AI coding session.
3. **A bundler that misnames the stylesheet exits 0.** Obsidian reads `styles.css` and nothing else, and
   three of the six bundler paths named it something else — so the gate tier's `styles` step checks the
   emitted artifact rather than the build's exit code. See "Every bundler has to be told to name the
   stylesheet `styles.css`" above.
4. **A bundler that leaves the WebAssembly module outside the bundle exits 0.** Obsidian ships `main.js`
   and nothing beside it, and three of the five bundlers emitted a sibling `.wasm` by default — so the
   gate tier's `wasm` step asserts no stray `.wasm` in `dist/build` AND the module's bytes inside
   `main.js`. Both clauses: without the second, a bundler that tree-shook the import away would pass on
   the first alone. See "Every bundler has to be told to INLINE the WebAssembly module into `main.js`".
5. **A bundler that code-splits exits 0.** obsidian-dev-utils has dynamic imports, and webpack and vite
   (lib mode inlines them only for `umd` / `iife`, not `cjs`) each turned them into sibling chunks that
   `main.js` loads by name at runtime — so every path reaching one failed in an installed plugin. Each
   bundler is told to keep one file: rollup `inlineDynamicImports`, vite
   `rollupOptions.output.inlineDynamicImports`, webpack `output.asyncChunks: false`; esbuild writes one
   `outfile`, and parcel's node target was measured emitting one file with no sibling `require`. The gate
   tier's `bundle` step asserts `dist/build/main.js` exists and is the only script there. Its catch-all
   sibling, `release-files`, fails any other file there beyond `manifest.json` and `styles.css`. Webpack's
   terser used to cut the bundled dependencies' license comments into a `main.js.LICENSE.txt` that no
   release ships, until `new TerserPlugin({ extractComments: false })` kept them inline in `main.js`.
6. **Hard-wrapped markdown lints clean and renders wrong.** Obsidian's parser runs with `breaks: true`, so
   every newline in a README or a demo-vault note becomes a `<br>` — both a README and a demo-vault note need one source line
   per paragraph, per list item, per blockquote line. Nothing in a generated project says so: `MD013` is
   off in the emitted markdownlint config, dprint excludes markdown, and obsidian-dev-utils' demo-vault
   coverage suite checks the `# H1`, the link style and reachability rather than the prose form. So the
   render tier's `hard-wrapped-markdown` step reads the emitted `.md` bytes. Seven templates wrapped their
   prose before it existed, and every tier was green. Fenced code, tables, raw HTML and thematic breaks
   keep their own line structure; consecutive list items and blockquote lines are already one line each.

**No tier runs `npm run dev`, and none can: a watch task does not terminate.** The gate tier runs each
emitted script to completion, so `dev` is the one script whose *presence and text* are verified and
whose behavior never is. That is the whole reason `dev.ts` and `build.ts` could name different
bundlers on eight of the fifteen preset x bundler combinations while every tier stayed green. What
guards it instead is a unit test in `src/templates.test.ts` asserting the two scripts make the same
bundler decision across all fifteen — cheap, because it reads the rendered bytes rather than running
them. Anything else `dev` alone decides needs the same treatment; do not assume a tier will catch it.

The render tier also carries three **structural** checks, because a clean parse is not a clean file and
each of these is something composition produces rather than something a template author writes.
`await-outside-async` — a partial holding `await import(…)` rendered into a synchronous function, which
is TS1308 and a hard bundler parse error. `empty-block` — a wrapper that renders `if (prod) { <section> }`
emits `if (prod) { }` on every answer contributing nothing, which the emitted ESLint config rejects with
`no-empty`. `duplicate-declaration` — the per-answer-partial trap above. None of the three is a syntax
error, so the parse pass sees nothing; all three are cheap enough to run over all 265 cases.

A fourth, `foreign-lint-directive`, is about which preset a line reaches. On a `standalone` + ESLint case,
it fails any inline directive naming a rule that only obsidian-dev-utils' shared config turns on. See
"A lint directive for the shared config goes in an `_dev-utils` section".

Three rules that are easy to get wrong and were:

- **Enumerate questions from the feature option arrays, never from `FEATURE_REGISTRIES`.** That list is
  only the questions whose options contribute a partial, and copying it is precisely how `platformSupport`
  came to be prompted for and discarded, leaving `isDesktopOnly` out of every manifest ever generated.
- **Sharding walks the space on a stride coprime to its size, not by counting.** Consecutive ordinals
  differ only in the lowest dimensions, so a shard taking every Nth ordinal freezes any dimension whose
  radix shares a factor with N — with ten workers and the first two questions sized 2 and 5, every shard
  would test one of those ten combinations and report success.
- **A package name that resolves to nothing still reaches `package.json`.** `resolveVersions` falls back
  to the literal `latest` when a registry lookup fails, so that generating offline works; the cost is that
  a typo'd or dead package name looks ordinary until `npm install`. `npm run verify:answer-space --
  --check-registry` is the pass that catches it, and it is worth running before any release.

### A fourth check asks whether the output looks like a real plugin

The three tiers above all ask the same question — is the output valid? — over as much of the answer space
as each can afford. `verify:plugin-drift` (`src/plugin-drift-checks.ts`) asks a different one, over a single
point in that space: does what the obsidian-dev-utils presets emit actually look like the 29 plugins
checked out beside this repo? The README advertises `obsidian-sample-plugin-extended` as the "Sample
output", so a divergence there is a documented promise being broken, and nothing measured it until this
existed. It found, among other things, that the conventional-commits answer had never registered husky:
the hooks were emitted, husky was installed, and no hook had ever fired.

Four things about it are load-bearing.

**The comparison runs against real-plugin-shaped answers, not the defaults.** `PLUGIN_SHAPED_ANSWERS` is measured
across the real plugins rather than chosen — esbuild and vitest are unanimous, all 29 carry
`@obsidian-typings/obsidian-public-latest`, 27 of 29 are not desktop-only. Comparing a
`webpack + biome + jest` generation against the real plugins would report drift that is really just "the user
answered differently", which is noise that would swamp the signal. `gitHubActions: 'none'` is the answer
that reads oddly: no real plugin has a `ci.yml`, and asking for one would bury the finding that the one
workflow all 29 DO ship — `attest-release-assets.yml` — was emitted by no answer at all.

**A trait counts as the real plugins' only at unanimity, and there is a floor below which a divided trait is not
reported.** The first run had no floor and produced 1793 findings, all but a few dozen being one plugin's
own demo-vault notes and vendored files at 1 of 29. Below a majority the real plugins have no shape to match, only
contents.

**Findings are scoped by preset.** `enhanced` and `demo` do not emit the same project, so a baseline entry
naming only the trait would let one of demo's forced framework components silence the same key under
`enhanced`, where it would be a genuine surprise.

**`plugin-drift-baseline.json` is reconciled in both directions**, exactly as
`pinned-versions.json` is: an unrecorded difference fails, an entry whose difference has since gone fails,
and a moved `pluginCount` fails — the count is the evidence behind most of the judgements recorded there.

Dependencies and tsconfig `types` are deliberately not compared. Both were settled by following the
real plugins, and re-reporting them would re-litigate a closed decision.

The plugin set is discovered by scanning the parent directory for anything with both a `manifest.json` and a
`src/main.ts` — the same test `PROJECTS.md` applies, run against the filesystem rather than read out of a
roster that can drift. It reads the tracked set (`git ls-files`) on the real-plugin side and walks the tree on
the generated side, because a generated project is not a repository yet.

### Template engine: EJS

Researched all major `create-*` packages. Only create-vue and create-nuxt-app use a template engine (both EJS). The rest use plain file copying. EJS is the only engine used in practice by major scaffolding tools.

## Workflow

- Commit after each logical step. Do not batch unrelated changes into a single commit.

## Code Style

- TypeScript strict mode
- ESLint with `@eslint/js` + `typescript-eslint`
- Conventional commits (commitlint)
- Tests with vitest, co-located next to the source they test — `foo.ts` → `foo.test.ts` (G10h); no `__tests__/` or `test/` directories
