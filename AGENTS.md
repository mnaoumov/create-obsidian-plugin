# AGENTS.md

## Project Overview

`@mnaoumov/create-obsidian-plugin` — an npm scaffolding CLI that generates Obsidian plugin projects from modern templates. Uses EJS for templating with a partial-based composition system.

## Architecture

- `src/` — Core generator logic (TemplateBuilder, features, prompts, templates), with the vitest unit tests co-located as `foo.test.ts` beside what they test
- `src/features/` — One kebab-case directory per question (`preset/`, `bundler/`, `ui-framework/`, `linter/`, `formatter/`, `test-runner/`, `styling/`, …), each holding one file per answer plus an `index.ts` exporting its options array. `FEATURE_REGISTRIES` in `src/templates.ts` is the list of them, and its order is the order partials are concatenated in.
- `templates/default/` — EJS template files (all must have `.ejs` extension), plus the one declared exception: a file whose extension is in `ASSET_EXTENSIONS` carries no `.ejs` and is copied byte for byte (see "One template is not EJS")
- `scripts/` — All build/lint/test logic lives here
- `dist/` — Built output (published to npm, not tracked in git)
- `fleet-drift-baseline.json` — the differences between the emitted odu presets and the real plugins that are deliberate, each with the reason it is (see the fourth-check section below)

## Design Decisions

### No obsidian ecosystem dependencies in the generator

The generator project itself must NOT depend on `obsidian`, `obsidian-typings`, or `obsidian-dev-utils`. These are only used in the *generated* plugin projects.

### Two-tier script strategy

- **Enhanced/demo presets**: thin wrapper scripts that call the matching `obsidian-dev-utils` module — `script-utils/bundlers/esbuild`, `script-utils/linters/eslint`, `script-utils/test-runners/vitest`, `script-utils/version`, and so on, each wrapped in `wrapCliTask`. Updates propagate via `npm update`. There is no `script-utils/commands` barrel; every command has its own module.
- **Standalone preset**: fully inlined self-contained scripts with no obsidian-dev-utils dependency.

**Four scripts are the documented exceptions: they split on the TOOL first, not the preset.**

`build.ts` and `dev.ts` split on the **bundler**, and they must stay the same decision made once —
`dev` is `build` in watch mode. Splitting on the preset first is what made every odu preset run
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
process restart for no equivalent benefit. T764-P42 asked and answered it; do not re-open it.

The two format scripts split on the **formatter** for the same class of reason.
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

### Unit tests import the plugin, which is what forces every piece of the mock wiring

The emitted `src/plugin.test.ts` imports `./plugin.ts` and asserts the class extends Obsidian's `Plugin`.
It used to import nothing and assert `1 + 1 === 2`, which passed on every combination while proving
nothing — the gate tier's non-zero collected-test count only means something once the sample test
actually loads the code under test. Everything below exists because that import has to work; none of it
is optional decoration, and each piece was found by a combination that failed without it.

- **`obsidian` is types-only** (`"main": ""`, a tarball of `.d.ts` files), so it must be aliased to
  `obsidian-test-mocks/obsidian` in every runner. The odu presets get that free from
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
  svelte-answer-only concern. The mapping is emitted for every jest project and every odu vitest project
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

### Three lists have to agree about which files are in the program

Typed ESLint rules need every file ESLint reaches to be in the tsconfig `include`, so the emitted
`eslint.config.mts`'s `typeScriptFiles`, the emitted `tsconfig.json`'s `include`, and the set of files
actually written have to say the same thing. `e2e/` was in neither list while
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
| rollup | `styles.css` | `postcss({ extract: … })` / `scss({ output: … })` — always did |
| esbuild (odu) | `styles.css` | obsidian-dev-utils' own `renameCssPlugin` — always did |
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

### The odu presets pass their extra esbuild plugins through `customEsbuildPlugins`

obsidian-dev-utils' `build()` and `dev()` both accept `customEsbuildPlugins` and spread them into their
own plugin list. They already register a svelte wrapper and a sass plugin — which is exactly why svelte
and SCSS work on these presets untouched — but nothing for Vue, so `esbuild-plugin-vue3` was installed
and never wired in. `scripts/esbuild-plugins.ts` holds that list, emitted for the odu presets when the
bundler is esbuild, and both `build.ts` and `dev.ts` pass it.

Both import it **unconditionally**, because both live under `@bundler_esbuild` where the answer is
guaranteed. `dev.ts` used to gate the import and the argument on the `esbuild` partial
(`dev.ts_odu@import_esbuild`, `dev.ts_odu@options_esbuild`) from a position where the bundler was
*not* yet decided — so on any other bundler that gate rendered a bare `dev()` with no plugin list at
all. A partial keyed on the answer its own branch already guarantees is a tautology in the good case
and a silent hole in the bad one.

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

### Three-tier answer-space verification

The generator asks 23 questions — 21 choices plus two presence branches (`fundingUrl` and
`obsidianConfigFolder`, on which `buildTemplate` contributes `has-funding` and `has-vault-true`/`false`).
They multiply out to **15,049,359,360** combinations, so "test every combination" is not one job. It is
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
renderer; that habit is how a wrong transcript ended up quoted in T764's own report.

`npm run gate:case -- <question>=<answer> … [--out=<dir>]` (`scripts/gate-one-case.ts`) is its
counterpart one tier down: it resolves versions, generates ONE case and runs the identical `runGate`
over it, in the minute or two one case costs rather than the hour `verify:projects` takes. That is the
tool for *does this combination actually build, and what did the bundler emit?* — the question asked
while changing a bundler's configuration, and the one the whole WebAssembly pass was driven from.

`--exhaustive` exists on the plan tier and is **not** the default: at the measured 32 us it is ~134 hours
single-threaded and ~13 on ten workers, and the flag prints that projection before it starts.

**Four failure modes make a silent pass the default here, and every tier is shaped around them.**

1. **An unresolved partial renders as `''`, not an error.** A registered file whose partials were all
   left unresolved is written EMPTY — and an empty `.ts` compiles, an empty config reads as "no
   configuration", and every existence check on it passes. The plan tier catches it before rendering
   (`empty-emitted-file`); the render tier catches it in the bytes (`empty-file`).
2. **A test runner that collects nothing exits 0.** Jest and vitest both do, so the gate tier reads the
   collected test count out of the runner's summary and treats zero as a failure.
3. **A bundler that misnames the stylesheet exits 0.** Obsidian reads `styles.css` and nothing else, and
   three of the six bundler paths named it something else — so the gate tier's `styles` step checks the
   emitted artifact rather than the build's exit code. See "Every bundler has to be told to name the
   stylesheet `styles.css`" above.
4. **A bundler that leaves the WebAssembly module outside the bundle exits 0.** Obsidian ships `main.js`
   and nothing beside it, and three of the five bundlers emitted a sibling `.wasm` by default — so the
   gate tier's `wasm` step asserts no stray `.wasm` in `dist/build` AND the module's bytes inside
   `main.js`. Both clauses: without the second, a bundler that tree-shook the import away would pass on
   the first alone. See "Every bundler has to be told to INLINE the WebAssembly module into `main.js`".

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
as each can afford. `verify:fleet-drift` (`src/fleet-drift-checks.ts`) asks a different one, over a single
point in that space: does what the obsidian-dev-utils presets emit actually look like the 29 plugins
checked out beside this repo? The README advertises `obsidian-sample-plugin-extended` as the "Sample
output", so a divergence there is a documented promise being broken, and nothing measured it until this
existed. It found, among other things, that the conventional-commits answer had never registered husky:
the hooks were emitted, husky was installed, and no hook had ever fired.

Four things about it are load-bearing.

**The comparison runs against fleet-shaped answers, not the defaults.** `FLEET_SHAPED_ANSWERS` is measured
across the fleet rather than chosen — esbuild and vitest are unanimous, all 29 carry
`@obsidian-typings/obsidian-public-latest`, 27 of 29 are not desktop-only. Comparing a
`webpack + biome + jest` generation against the fleet would report drift that is really just "the user
answered differently", which is noise that would swamp the signal. `gitHubActions: 'none'` is the answer
that reads oddly: no fleet plugin has a `ci.yml`, and asking for one would bury the finding that the one
workflow all 29 DO ship — `attest-release-assets.yml` — was emitted by no answer at all.

**A trait counts as the fleet's only at unanimity, and there is a floor below which a divided trait is not
reported.** The first run had no floor and produced 1793 findings, all but a few dozen being one plugin's
own demo-vault notes and vendored files at 1 of 29. Below a majority the fleet has no shape to match, only
contents.

**Findings are scoped by preset.** `enhanced` and `demo` do not emit the same project, so a baseline entry
naming only the trait would let one of demo's forced framework components silence the same key under
`enhanced`, where it would be a genuine surprise.

**`fleet-drift-baseline.json` is reconciled in both directions**, exactly as G100 requires of
`pinned-versions.json`: an unrecorded difference fails, an entry whose difference has since gone fails,
and a moved `fleetCount` fails — the count is the evidence behind most of the judgements recorded there.

Dependencies and tsconfig `types` are deliberately not compared. T699-P42 settled both by following the
fleet, and re-reporting them would re-litigate a closed decision.

The fleet is discovered by scanning the parent directory for anything with both a `manifest.json` and a
`src/main.ts` — the same test `PROJECTS.md` applies, run against the filesystem rather than read out of a
roster that can drift. It reads the tracked set (`git ls-files`) on the fleet side and walks the tree on
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
