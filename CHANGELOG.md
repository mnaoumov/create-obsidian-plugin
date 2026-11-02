# Changelog

All notable changes to this project will be documented in this file.

## 1.4.1 (2026-11-01)

### Fixes

- Every tool, library, framework, package, shell and service name is marked as code in the README, the docs site and every Markdown file and issue form a generated project gets: `esbuild`, `React`, `Vitest`, `ESLint`, `PostCSS`, `EJS`, `PowerShell`, `GitHub`, `GitHub Actions` and the rest.
- Bare URLs are titled links, and the docs showcase README links each developer docs page by its title.
- The check that catches a bare name reads one shared list, covers the templates too, and leaves a name that is also an ordinary word alone in lowercase.

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.4.0...1.4.1)

## 1.4.0 (2026-11-01)

### Features

- The `official-sample` preset writes the `LICENSE` copyright line as `Copyright (C) <year> by <author>`, keeping upstream's 0BSD text.
- A See also section compares similar scaffolding tools, in the README and on the docs site.
- `CHANGELOG.md`, back-filled from the tags, linked from the README and the docs site.
- Tool names are marked as code in all Markdown prose, with a test that catches a bare one.

### Removed

- The `enhanced` preset alias: `--preset=enhanced` now fails validation like any unknown value.
- Every migration of an older `.create-obsidian-plugin.json` answer shape (`framework`, `cssMode`, `buildSystem`, `gitHubFunding`, a missing `defaultBranch` or `coverageBadge`, a stored `pluginShortName`).

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.3.0...1.4.0)
## 1.3.0 (2026-11-01)

### Features

- **cli:** quote the -- separator in --help and the answers-file hint

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.2.0...1.3.0)

## 1.2.0 (2026-11-01)

### Features

- **template:** add a Similar plugins section to the generated README
- **template:** let a parenthesized folder group templates without entering their path
- **issue-templates:** give the bug form field ids that bug-report links prefill
- tell AI agents how to file an issue when they skip the forms
- scaffold the Report a bug command whenever issue forms are chosen

### Fixes

- **deps:** float brace-expansion to 5.0.12 and fast-uri to 3.1.9 past their advisories
- **versions:** drop the smol-toml advisory override now that `typescript-dev-toolkit` 3.7.3 pins 1.9.1
- **templates:** select .obsidian-lib in the framework stylesheets
- **templates:** show the plugin name as code in the demo sample view
- **gate:** report a missing package manager as could not run, not a failed install
- **bundler:** leave `esbuild` to `obsidian-dev-toolkit` on the framework presets
- **lint:** discover root `ESLint` config for scripts
- **lint:** reconcile unused binding checks with `ESLint` 10
- **templates:** format `Solid` readonly configuration comment
- override vulnerable development KaTeX dependency
- **demo:** avoid keyword identifier in number setting callback
- **demo:** stop scaffolding the gitignored scratch note
- **versions:** override re2js to ^2.9.1 in scaffolded projects for GHSA-gg6h-894w-4m9c
- **spell-checker:** know "toolkits" in the emitted cspell.json
- **versions:** hold toolkit-declared packages in the toolkit's range

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.1.0...1.2.0)

## 1.1.0 (2026-10-21)

### Features

- scaffold onto @mnaoumov/obsidian-lib and the @mnaoumov toolkits
- **templates:** take `commitlint` and `nano-staged` configs from `typescript-dev-toolkit`
- **preset:** keep preset "enhanced" working as a deprecated alias of all-in-one
- **preset:** label the preset All-in-one Framework and lead its hint with the helper library
- **preset:** add the Official sample plugin preset
- **docs-showcase:** extract, wrap and type-check the developer docs' code blocks
- **preset:** add the Developer docs showcase preset
- **upstream-sync:** watch every upstream and open one update PR per change
- **docs-showcase:** link each snippet's docs page from what its command shows
- **templates:** link Discussions from the issue chooser
- **formatter:** run `prettier` and `biome` through the toolkit runners
- **test-runner:** run `jest` through the toolkits on the framework presets
- **e2e:** run wdio-obsidian and obsidian-test through `obsidian-dev-toolkit`
- **github-actions:** call `obsidian-dev-toolkit`'s reusable workflows
- **bundler:** build every bundler through `obsidian-dev-toolkit`'s adapters
- **scaffold:** emit .nvmrc so CI runs the project's Node, not the latest LTS
- **docs-showcase:** recognize a code-examples-only LICENSE and refuse unknown ones

### Fixes

- **demo-vault:** import configureCommunityPlugin from @mnaoumov/obsidian-lib
- **`dprint`:** keep JSX attributes double-quoted
- **versions:** override smol-toml to clear GHSA-r4xh-jqrq-34v2
- **verify-tarball:** read `npm` 12's keyed `npm` pack --json output as well as the array
- **templates:** emit `nano-staged` config patterns in sorted order
- **templates:** require CodeScript Toolkit 13.8.0 for the demo-vault injection
- **templates:** drop the `preact` view's import-x/no-deprecated directives for `preact` 11
- **templates:** remove the three directives the previous commit left staged out
- **cli:** let render:case and gate:case read a deprecated answer value as the CLI does
- **update:** ask every question again when the user chooses to change settings
- **templates:** pass the framework scaffolds' own lint, format and audit gate
- **verify:** read the pins step's checks from under the pins key
- **versions:** pin @codemirror/state and view to obsidian 1.14.4's peers
- **prompts:** offer "Keep current tooling" on update and make "Use recommended defaults" apply them
- **cli-args:** look the mode up instead of asserting a string to the Mode enum
- **templates:** clear what the toolkit runners and verify:projects found
- **templates:** keep `biome` and `dprint` agreeing on the framework configs
- **standalone:** clear the gate failures the `wdio` install used to hide
- **templates:** reach the CSS module through its class names so `vite` keeps it
- **test:** declare sweepCases' void return so `tsc` accepts the generator
- **templates:** ignore coverage/ in `git` and `cspell`, spell-check staged dotfiles
- **scaffold:** install the `git` hooks after `git` init and make the first commit conventional
- **demo-vault:** stop linking to the gitignored scratch note
- **`cspell`:** know the word the template's word list adds for the demo vault .gitignore
- **plugin-drift:** leave generator-scaffolded plugins out of the real-plugin set
- **versions:** read the smol-toml pin off `typescript-dev-toolkit`'s `markdownlint-cli2`
- **templates:** mark the plugin name as code in the README and demo-vault prose

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.0.2...1.1.0)

## 1.0.2 (2026-10-10)

### Features

- verify `obsidian-dev-utils` source links against its checkout

### Fixes

- **verify-tarball:** pack with --ignore-scripts so HUSKY=0 output cannot break the JSON
- **templates:** point dead upstream links at their current homes

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.0.1...1.0.2)

## 1.0.1 (2026-10-07)

### Other

- publish to `npm` from `GitHub Actions` with trusted publishing

[Full diff](https://github.com/mnaoumov/create-obsidian-plugin/compare/1.0.0...1.0.1)

## 1.0.0 (2026-10-07)

Initial release.

[Commits](https://github.com/mnaoumov/create-obsidian-plugin/commits/1.0.0)
