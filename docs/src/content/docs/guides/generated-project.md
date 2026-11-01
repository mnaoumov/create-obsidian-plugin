---
title: The generated project
description: The files a new project starts with, the npm scripts it carries, and the demo vault that documents it.
sidebar:
  order: 5
---

What you get depends on your answers. This page describes the default All-in-one Framework project; the other presets and answers add, replace or leave out pieces, as [Feature options](/create-obsidian-plugin/guides/feature-options/) describes.

## Layout

```text
obsidian-my-tool/
  .create-obsidian-plugin.json   # your answers and the hashes an update compares against
  .github/
    FUNDING.yml                  # with a funding platform
    ISSUE_TEMPLATE/              # with the issue forms
    workflows/                   # CI, release on tag push, and the yearly LICENSE bump
  .husky/                        # commit-msg and pre-commit hooks, with commit linting
  demo-vault/                    # the plugin's documentation, as a real vault
  scripts/                       # one small script per npm script
  src/
    main.ts                      # the entry point Obsidian loads
    plugin.ts                    # the plugin class: commands, settings tab, command handlers
    plugin-settings.ts           # the settings and their defaults
    plugin-settings-component.ts
    plugin-settings-tab.ts
    styles/main.scss
    *.test.ts                    # unit tests beside the code they test
  .env                           # OBSIDIAN_CONFIG_FOLDER, the vault each build copies the plugin into
  CONTRIBUTING.md                # how to set up, build, test and release
  manifest.json
  package.json
  README.md
  versions.json
```

Beside them sit the configuration files of the tools you chose: `tsconfig.json`, `eslint.config.mts`, `dprint.json`, `cspell.json`, `.markdownlint-cli2.mjs`, `vitest.config.ts`, `commitlint.config.ts`, `.nano-staged.mjs` and so on. Each root config is a thin wrapper; the logic it needs lives in `scripts/`.

On the framework presets the scripts call [`@mnaoumov/obsidian-dev-toolkit`](https://github.com/mnaoumov/obsidian-dev-toolkit) and [`@mnaoumov/typescript-dev-toolkit`](https://github.com/mnaoumov/typescript-dev-toolkit), and the plugin code builds on [`@mnaoumov/obsidian-lib`](https://mnaoumov.dev/obsidian-lib/). So `npm update` brings improvements to the build, lint, test and release steps without regenerating anything. The Standalone preset inlines every script instead and depends on no `@mnaoumov` package.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Build in watch mode, and copy the plugin into the vault named in `.env` |
| `npm run build` | Production build into `dist/` |
| `npm run gate` | Every check the release runs: format, spelling, Markdown, build, lint and tests. Run it before committing |
| `npm run lint`, `npm run lint:fix` | Lint, or lint and fix |
| `npm run format`, `npm run format:check` | Format the code, or check it is formatted |
| `npm run spellcheck` | Check spelling |
| `npm run lint:md`, `npm run lint:md:fix` | Lint Markdown files |
| `npm test`, `npm run test:watch`, `npm run test:coverage` | Run the unit tests once, on every change, or with coverage |
| `npm run test:integration` | Run the integration suites a fresh machine can run: the demo-vault checks. `test:integration:desktop` and `test:integration:android` each run on their own, once a desktop Obsidian or an Android emulator is set up |
| `npm run version` | Bump the version, update `manifest.json` and `versions.json`, and archive the demo vault into the release |
| `npm run commit` | Commit with a guided Conventional Commits prompt |

Which of them a project has follows the answers: a project with no spell checker has no `spellcheck`, and `npm run gate` skips the checks a project does not have.

## Tests

`src/plugin.test.ts` imports the plugin and checks it loads; `src/main.test.ts` checks the entry point exports it. They run against [`obsidian-test-mocks`](https://www.npmjs.com/package/obsidian-test-mocks), with no Obsidian installed. `.svelte` and `.vue` components are stubbed in unit tests, so render them in an integration test instead.

The screenshot harness of the real plugins is left out, and `npm run test:integration` leaves out the desktop and Android suites: they need a provisioned Obsidian or emulator, so a fresh project would fail tests nothing on the machine can run.

## The demo vault

On the framework presets, `demo-vault/` is the plugin's documentation: a real Obsidian vault whose notes explain each feature and demonstrate it with buttons run by [CodeScript Toolkit](https://github.com/mnaoumov/obsidian-codescript-toolkit). Start at `demo-vault/00 Start.md`.

`npm run version` archives it into each GitHub release, with the freshly built plugin added, and the plugin's **Open demo vault** command downloads and opens that copy. Two suites check it: `npm run test:integration:no-app` reads the notes without launching Obsidian, and `npm run test:integration:demo-vault` clicks every button in a real one.

The Standalone preset has no release flow to archive the vault into, so it has no demo vault.

## What is not generated

There is no `AGENTS.md`. A scaffolded one could only restate the README about code nobody has written yet. See [Notes for AI agents](/create-obsidian-plugin/guides/ai-agents/) for what the project does carry for them.
