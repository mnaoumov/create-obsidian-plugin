---
title: Feature options
description: Every question the wizard asks about tooling, and the answers each one accepts.
sidebar:
  order: 4
---

The wizard lets you pick and choose from the categories below. The recommended answers are the defaults.

Every question can also be answered with a flag, `--<answer>=<value>`. `--help` lists each answer's name and the values it accepts, and [Command-line options](/create-obsidian-plugin/guides/command-line/) shows how to pass them.

## Preset

| Option                  | Description                                                                                                                                                                                                                                                                                  |
|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| All-in-one Framework    | Recommended. The author's framework: [@mnaoumov/obsidian-lib](https://github.com/mnaoumov/obsidian-lib), a library of ready-made helpers for settings, commands, modals, notices, file and link handling, and more, plus the @mnaoumov toolkits for building, linting, testing and releases. |
| Demo                    | All features enabled for demonstration                                                                                                                                                                                                                                                       |
| Developer docs showcase | The All-in-one Framework project, plus every code block of the [Obsidian developer docs](https://docs.obsidian.md) as a command you can run. See [Developer docs showcase](#developer-docs-showcase)                                                                                         |
| Standalone              | Standalone plugin without the @mnaoumov library dependencies                                                                                                                                                                                                                                 |
| Official sample plugin  | Exactly [obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin), with your plugin's id, name, author, description and `LICENSE` copyright holder filled in. See [Official sample plugin](#official-sample-plugin)                                          |

### Official sample plugin

`"preset": "official-sample"` gives you Obsidian's own sample plugin as it is, rather than a project built from this tool's templates. No other question is asked: upstream has already chosen its tooling (`esbuild`, `eslint` with `eslint-plugin-obsidianmd`, `npm`), and a tooling flag beside this preset is refused.

Only the plugin's identity changes:

- `manifest.json`: `id`, `name`, `description`, `author`, `authorUrl` (your `GitHub` profile) and `fundingUrl`, which is removed if you choose no funding platform
- `package.json` and `package-lock.json`: the package name, `obsidian-<id>`
- `README.md`: the title
- `LICENSE`: the copyright line, `Copyright (C) <current year> by <author>`, so the plugin is yours; upstream's 0BSD text under it is kept

Every other file is upstream's, byte for byte, including its `AGENTS.md`. The generator adds only its own `.create-obsidian-plugin.json`, which is what lets an update work the way it does for every preset.

The files come from a snapshot this release ships, pinned to an upstream commit in `upstreams.json`, so generating works offline and gives the same result every time. Pass `--latest` to copy upstream as it is today instead; if upstream cannot be reached, the shipped snapshot is used with a warning.

Upstream's `npm run lint` fails on a fresh copy, and on upstream itself, until you rename the sample classes and remove the sample code: `eslint-plugin-obsidianmd` checks for exactly that. `npm run build` passes.

### Developer docs showcase

`"preset": "docs-showcase"` generates the All-in-one Framework project and adds `src/docs/`: every code block of [obsidianmd/obsidian-developer-docs](https://github.com/obsidianmd/obsidian-developer-docs), each one a command. Open the command palette, type `Docs:`, and run `Docs: Vault > Modify files` to see that block of the Vault page work against a scratch note.

Each block is kept as the docs show it. The generator adds only what the docs leave to the reader: the imports a block leaves out, and a host that gives the block a plugin to register things on, a note to work with, an editor, or an element to draw into. A block that declares a plugin class is loaded as a child plugin, and running its command again unloads it. A stylesheet is applied and removed the same way.

`src/docs/README.md` lists every block of the docs. A block that does not compile against the `obsidian` API, or that is not plugin code (shell commands, JSON samples, diagrams), is listed there with the reason rather than left out silently.

The blocks are type-checked by `src/docs/tsconfig.json`, which carries the official sample plugin's compiler options, so the project's own stricter `tsconfig.json`, linter, formatter and spell checker leave the folder alone. With the `vitest` answer, `npm run test:integration:desktop` runs every `Docs:` command in a real Obsidian and fails on any that throws.

The blocks come from a snapshot this release ships, pinned to an upstream commit in `upstreams.json`. Maintainers refresh it with `npm run sync:docs-showcase`.

## Bundler

| Option    | Description                              |
|-----------|------------------------------------------|
| `esbuild` | Fast and simple (recommended)            |
| `Parcel`  | Zero-config bundler                      |
| `Rollup`  | Flexible with plugin ecosystem           |
| `Vite`    | Modern dev server with HMR               |
| `Webpack` | Mature bundler with broad plugin support |

## UI framework

| Option   | Description                               |
|----------|-------------------------------------------|
| (none)   | Plain TypeScript, no UI framework         |
| `Lit`    | Web Components with declarative templates |
| `Preact` | Lightweight `React` alternative (3kB)     |
| `React`  | Component-based UI with JSX               |
| `Solid`  | Fine-grained reactivity, no virtual DOM   |
| `Svelte` | Lightweight reactive components           |
| `Vue`    | Progressive framework with SFC            |

## Linter

| Option   | Description                                 |
|----------|---------------------------------------------|
| (none)   | No linting                                  |
| `Biome`  | Fast linter and formatter                   |
| `ESLint` | Industry standard for JavaScript/TypeScript |

## Formatter

| Option     | Description                                |
|------------|--------------------------------------------|
| (none)     | No formatting                              |
| `Biome`    | Fast formatter (pairs with `Biome` linter) |
| `dprint`   | Fast, pluggable, written in Rust           |
| `Prettier` | Opinionated, widely adopted                |

## Spell checker

| Option   | Description                         |
|----------|-------------------------------------|
| (none)   | No spell checking                   |
| `cspell` | Configurable spell checker for code |

## Markdown linter

| Option         | Description                                   |
|----------------|-----------------------------------------------|
| (none)         | No Markdown linting                           |
| `markdownlint` | Lint Markdown files for style and consistency |

## Unit testing

| Option   | Description                  |
|----------|------------------------------|
| (none)   | No unit testing              |
| `Jest`   | Feature-rich, widely adopted |
| `Vitest` | Fast, Vite-native, ESM-first |

## E2E testing

| Option        | Description                                                 |
|---------------|-------------------------------------------------------------|
| (none)        | No E2E testing                                              |
| obsidian-test | Tests run inside Obsidian with real app APIs                |
| wdio-obsidian | `WebdriverIO` service for Obsidian, multi-version and CI/CD |

## Editor extensions

| Option     | Description                                          |
|------------|------------------------------------------------------|
| (none)     | No editor extensions                                 |
| CodeMirror | CodeMirror 6 state fields, view plugins, decorations |

## Styling

| Option         | Description                                |
|----------------|--------------------------------------------|
| (none)         | No custom styles                           |
| CSS            | Plain CSS styles                           |
| `CSS Modules`  | Scoped CSS with `.module.css` files        |
| `PostCSS`      | CSS with plugins (`autoprefixer`, nesting) |
| `SCSS`         | `Sass`/`SCSS` preprocessor                 |
| `Tailwind CSS` | Utility-first CSS framework                |

## WebAssembly support

| Option | Description                    |
|--------|--------------------------------|
| (none) | No WASM                        |
| WASM   | Import and use `.wasm` modules |

## Commit linting

| Option               | Description                                 |
|----------------------|---------------------------------------------|
| (none)               | No commit linting                           |
| Conventional Commits | `commitlint` on a `husky` `commit-msg` hook |

## Hot reload

| Option            | Description                                                                                    |
|-------------------|------------------------------------------------------------------------------------------------|
| (none)            | No hot reload support                                                                          |
| Hot Reload Plugin | Creates `.hotreload` marker for [Hot Reload](https://community.obsidian.md/plugins/hot-reload) |
| Obsidian CLI      | Reloads via `obsidian plugin:reload` CLI command                                               |

## Internationalization

| Option          | Description                                   |
|-----------------|-----------------------------------------------|
| (none)          | No internationalization                       |
| `i18next`       | Popular i18n framework with JSON translations |
| `typesafe-i18n` | Type-safe i18n with auto-generated types      |

## GitHub Actions

| Option       | Description                          |
|--------------|--------------------------------------|
| (none)       | No `GitHub Actions` workflows        |
| CI + Release | CI + automated release on tag push   |
| CI           | CI workflow only (lint, test, build) |

## GitHub issue templates

| Option        | Description                              |
|---------------|------------------------------------------|
| (none)        | No issue templates                       |
| Bug & Feature | Bug report and feature request templates |

See [Issue forms and Report a bug](/create-obsidian-plugin/guides/issue-forms/) for what the forms contain, and the command that comes with them.

## Coverage badge

| Option         | Description                                                    |
|----------------|----------------------------------------------------------------|
| (none)         | No coverage badge                                              |
| Coverage badge | A `coverage: 100%` badge at the end of the README's badge line |

## Funding

Asked with the project details, not under Customize. The platform and your username on it produce the `fundingUrl` in `manifest.json`, the README's badge and `## Support` link, and a `.github/FUNDING.yml` with that one platform's line. `(none)` emits none of them.

| Option            | Description                                                |
|-------------------|------------------------------------------------------------|
| (none)            | No funding link, FUNDING.yml or badge                      |
| Buy Me a Coffee   | buymeacoffee.com/&lt;username&gt;                          |
| `GitHub Sponsors` | github.com/sponsors/&lt;username&gt;                       |
| Ko-fi             | ko-fi.com/&lt;username&gt;                                 |
| Liberapay         | liberapay.com/&lt;username&gt;                             |
| Open Collective   | opencollective.com/&lt;username&gt;                        |
| Patreon           | patreon.com/&lt;username&gt;                               |
| Polar             | polar.sh/&lt;username&gt;                                  |
| thanks.dev        | thanks.dev/&lt;username&gt;, e.g. `u/gh/<GitHub username>` |
| Custom URL        | Any other URL, asked for as a URL rather than a username   |

## Obsidian API subset

| Option                | Description                                                |
|-----------------------|------------------------------------------------------------|
| Official API          | Stable, documented API only                                |
| Official + Unofficial | Includes internal undocumented APIs (for experienced devs) |

## Package manager

| Option | Description                         |
|--------|-------------------------------------|
| `bun`  | Fast all-in-one JavaScript toolkit  |
| `npm`  | Default, comes with Node.js         |
| `pnpm` | Fast, efficient disk space          |
| `yarn` | Classic alternative with workspaces |

## Platform support

| Option             | Description                        |
|--------------------|------------------------------------|
| Desktop and mobile | Plugin works on desktop and mobile |
| Desktop only       | Plugin works only on desktop       |
