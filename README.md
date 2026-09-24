# Create Obsidian Plugin

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)

A scaffolding CLI that generates [Obsidian](https://obsidian.md/) plugin projects from modern templates. Supports creating new plugins and updating existing ones.

## Create a new plugin

| Package manager | Runner | Command                                     |
|-----------------|--------|---------------------------------------------|
| npm             | create | `npm create @mnaoumov/obsidian-plugin`      |
| npm             | npx    | `npx @mnaoumov/create-obsidian-plugin`      |
| pnpm            | create | `pnpm create @mnaoumov/obsidian-plugin`     |
| pnpm            | dlx    | `pnpm dlx @mnaoumov/create-obsidian-plugin` |
| yarn            | create | `yarn create @mnaoumov/obsidian-plugin`     |
| yarn            | dlx    | `yarn dlx @mnaoumov/create-obsidian-plugin` |
| bun             | create | `bun create @mnaoumov/obsidian-plugin`      |
| bun             | bunx   | `bunx @mnaoumov/create-obsidian-plugin`     |

This walks you through an interactive wizard to scaffold a new Obsidian plugin project with optional post-scaffold actions (npm install, git init, GitHub repo creation).

The wizard first asks for the project's own details — plugin id, name and description, your name and GitHub username, the default branch (`main` unless you say otherwise; `git init` creates it and the CI workflow triggers on it), where people can support you (a funding platform and your username on it, or any URL), and the path to a test vault's config folder — then the feature options below.

The id, name and description are checked against what the Obsidian Community directory's automated review enforces, and a rejection says which rule you hit. That matters most for the id: the directory re-reads your `manifest.json` when you submit, and an id can never be changed once your plugin is published.

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

## Non-interactive use

Every question the wizard asks can be answered up front instead, which is what lets generation be scripted and repeated.

| Option | What it does |
|--------|--------------|
| `-y`, `--yes` | Take the default for every unanswered question, and skip the post-scaffold prompts. It never asks anything: a question no flag answers stops the run with an error naming the flag |
| `--mode=create\|update` | Create a new plugin, or update the project in the current directory, without being asked which. Under `--yes` it is required when the current directory holds a `.create-obsidian-plugin.json` |
| `--force` | Scaffold into an `obsidian-<pluginId>` directory that already exists, instead of being asked. Under `--yes` it is required when that directory exists |
| `-h`, `--help` | List every option, including the accepted values for each answer |
| `--answersFile=<path>` | Read answers from a JSON file |
| `--customTemplate=<dir>` | Layer your own templates over the built-in ones — see [Your own templates](#your-own-templates) |
| `--<answer>=<value>` | Set one answer, e.g. `--packageManager=yarn` |

Because `npm create` needs to be told which flags are yours rather than its own, npm takes a `--` first; pnpm, yarn and bun do not:

```bash
npm create @mnaoumov/obsidian-plugin -- --yes --pluginId=my-tool --packageManager=yarn
pnpm create @mnaoumov/obsidian-plugin --yes --pluginId=my-tool --packageManager=pnpm
```

Answers are applied in order, so the most specific wins: built-in defaults, then the answers saved in an existing project, then `--answersFile`, then individual flags. An answer given this way is not asked about again. On an update, `--yes` reuses the project's saved answers with any flags applied over them, instead of asking whether to change them.

The answers file is a JSON object using the same names. It also accepts a whole `.create-obsidian-plugin.json`, so you can point it at an existing project to scaffold another one like it:

```json
{
  "preset": "enhanced",
  "bundler": "esbuild",
  "packageManager": "npm",
  "pluginId": "my-tool"
}
```

Invalid input is refused rather than quietly ignored: an unknown answer, a value outside what a question accepts, a plugin id the wizard itself would reject, or `--currentYear` and `--pluginShortName`, which the generator computes rather than asks for.

### Saving the answers from an interactive run

At the end of the wizard, before scaffolding, you can save what you just answered as either form — a runnable script (`.cmd` on Windows, `.sh` elsewhere) or an answers file. You can save both and then generate; saving does not end the run. Every answer is written, not only the ones that differ from a default, so the recipe keeps producing the same project after a release changes a default.

## Your own templates

When the answers cannot express what every plugin of yours needs, keep it in a directory of your own and pass `--customTemplate=<dir>`. The directory mirrors the generator's `templates/default` and is searched ahead of it, so it uses the same EJS templates and the same partials:

```text
my-obsidian-template/
  overlay.json
  README.md@support_mine.ejs   # adds a section at an existing render('support') seam
  LICENSE.ejs                  # replaces the built-in LICENSE
  docs/NOTES.md.ejs            # a file the built-ins do not have
```

```json
{
  "partials": ["mine"],
  "files": ["docs/NOTES.md"],
  "packages": ["type-fest"],
  "badges": ["[![Docs](https://img.shields.io/badge/docs-here-blue)](https://example.com)"]
}
```

- A template at a built-in's path replaces it, but only when your answers emit that file: a `vite.config.ts.ejs` does nothing on an esbuild project.
- `partials` names what your partial files contribute. The names share one namespace with the built-in partials, so a name the generator already uses is refused. Your partials render after the built-in ones at every seam.
- `files` lists the paths you add, without `.ejs`. A built-in path is refused there; to replace one, just place its template.
- `packages` are added to `devDependencies`, and their versions are resolved when you generate, as the built-in ones are.
- `badges` go after the built-in badges, on the same README line.

The directory is checked before any question is asked. A template that nothing would ever emit, a partial nobody declared, a section no template renders, or any other file (except `overlay.json` and a `README.md` of its own) stops the run with the reason.

The directory is recorded in `.create-obsidian-plugin.json`, relative to the project, and an update applies it again. That keeps the files it produced updating cleanly rather than looking hand-edited. Pass `--customTemplate=<dir>` on an update to point at a moved directory, or `--customTemplate=` to stop using one. A recorded directory that is missing stops the update instead of quietly reverting your files to the built-ins.

## Feature options

The wizard lets you pick and choose from the following categories:

### Preset

| Option     | Description                                                                                                            |
|------------|------------------------------------------------------------------------------------------------------------------------|
| Demo       | All features enabled for demonstration                                                                                 |
| Enhanced   | Recommended. Uses [obsidian-dev-utils](https://github.com/mnaoumov/obsidian-dev-utils) for settings, linting, and more |
| Standalone | Standalone plugin without obsidian-dev-utils dependency                                                                |

### Bundler

| Option  | Description                              |
|---------|------------------------------------------|
| esbuild | Fast and simple (recommended)            |
| Parcel  | Zero-config bundler                      |
| Rollup  | Flexible with plugin ecosystem           |
| Vite    | Modern dev server with HMR               |
| Webpack | Mature bundler with broad plugin support |

### UI framework

| Option | Description                               |
|--------|-------------------------------------------|
| (none) | Plain TypeScript, no UI framework         |
| Lit    | Web Components with declarative templates |
| Preact | Lightweight React alternative (3kB)       |
| React  | Component-based UI with JSX               |
| Solid  | Fine-grained reactivity, no virtual DOM   |
| Svelte | Lightweight reactive components           |
| Vue    | Progressive framework with SFC            |

### Linter

| Option | Description                                 |
|--------|---------------------------------------------|
| (none) | No linting                                  |
| Biome  | Fast linter and formatter                   |
| ESLint | Industry standard for JavaScript/TypeScript |

### Formatter

| Option   | Description                              |
|----------|------------------------------------------|
| (none)   | No formatting                            |
| Biome    | Fast formatter (pairs with Biome linter) |
| dprint   | Fast, pluggable, written in Rust         |
| Prettier | Opinionated, widely adopted              |

### Spell checker

| Option | Description                         |
|--------|-------------------------------------|
| (none) | No spell checking                   |
| cspell | Configurable spell checker for code |

### Markdown linter

| Option       | Description                                   |
|--------------|-----------------------------------------------|
| (none)       | No Markdown linting                           |
| markdownlint | Lint Markdown files for style and consistency |

### Unit testing

| Option | Description                  |
|--------|------------------------------|
| (none) | No unit testing              |
| Jest   | Feature-rich, widely adopted |
| Vitest | Fast, Vite-native, ESM-first |

### E2E testing

| Option        | Description                                               |
|---------------|-----------------------------------------------------------|
| (none)        | No E2E testing                                            |
| obsidian-test | Tests run inside Obsidian with real app APIs              |
| wdio-obsidian | WebdriverIO service for Obsidian, multi-version and CI/CD |

### Editor extensions

| Option     | Description                                          |
|------------|------------------------------------------------------|
| (none)     | No editor extensions                                 |
| CodeMirror | CodeMirror 6 state fields, view plugins, decorations |

### Styling

| Option       | Description                              |
|--------------|------------------------------------------|
| (none)       | No custom styles                         |
| CSS          | Plain CSS styles                         |
| CSS Modules  | Scoped CSS with .module.css files        |
| PostCSS      | CSS with plugins (autoprefixer, nesting) |
| SCSS         | Sass/SCSS preprocessor                   |
| Tailwind CSS | Utility-first CSS framework              |

### WebAssembly support

| Option | Description                  |
|--------|------------------------------|
| (none) | No WASM                      |
| WASM   | Import and use .wasm modules |

### Commit linting

| Option               | Description                      |
|----------------------|----------------------------------|
| (none)               | No commit linting                |
| Conventional Commits | commitlint + husky + lint-staged |

### Hot reload

| Option            | Description                                                                             |
|-------------------|-----------------------------------------------------------------------------------------|
| (none)            | No hot reload support                                                                   |
| Hot Reload Plugin | Creates `.hotreload` marker for [Hot Reload](https://community.obsidian.md/plugins/hot-reload) |
| Obsidian CLI      | Reloads via `obsidian plugin:reload` CLI command                                        |

### Internationalization

| Option        | Description                                   |
|---------------|-----------------------------------------------|
| (none)        | No internationalization                       |
| i18next       | Popular i18n framework with JSON translations |
| typesafe-i18n | Type-safe i18n with auto-generated types      |

### GitHub Actions

| Option       | Description                          |
|--------------|--------------------------------------|
| (none)       | No GitHub Actions workflows          |
| CI + Release | CI + automated release on tag push   |
| CI           | CI workflow only (lint, test, build) |

### GitHub issue templates

| Option        | Description                              |
|---------------|------------------------------------------|
| (none)        | No issue templates                       |
| Bug & Feature | Bug report and feature request templates |

### Coverage badge

| Option         | Description                                                    |
|----------------|----------------------------------------------------------------|
| (none)         | No coverage badge                                              |
| Coverage badge | A `coverage: 100%` badge at the end of the README's badge line |

### Funding

Asked with the project details, not under Customize. The platform and your username on it produce the `fundingUrl` in `manifest.json`, the README's badge and `## Support` link, and a `.github/FUNDING.yml` with that one platform's line. `(none)` emits none of them.

| Option          | Description                                                |
|-----------------|------------------------------------------------------------|
| (none)          | No funding link, FUNDING.yml or badge                      |
| Buy Me a Coffee | buymeacoffee.com/&lt;username&gt;                          |
| GitHub Sponsors | github.com/sponsors/&lt;username&gt;                       |
| Ko-fi           | ko-fi.com/&lt;username&gt;                                 |
| Liberapay       | liberapay.com/&lt;username&gt;                             |
| Open Collective | opencollective.com/&lt;username&gt;                        |
| Patreon         | patreon.com/&lt;username&gt;                               |
| Polar           | polar.sh/&lt;username&gt;                                  |
| thanks.dev      | thanks.dev/&lt;username&gt;, e.g. `u/gh/<GitHub username>` |
| Custom URL      | Any other URL, asked for as a URL rather than a username   |

### Obsidian API subset

| Option                | Description                                                |
|-----------------------|------------------------------------------------------------|
| Official API          | Stable, documented API only                                |
| Official + Unofficial | Includes internal undocumented APIs (for experienced devs) |

### Package manager

| Option | Description                         |
|--------|-------------------------------------|
| Bun    | Fast all-in-one JavaScript toolkit  |
| npm    | Default, comes with Node.js         |
| pnpm   | Fast, efficient disk space          |
| Yarn   | Classic alternative with workspaces |

### Platform support

| Option             | Description                        |
|--------------------|------------------------------------|
| Desktop and mobile | Plugin works on desktop and mobile |
| Desktop only       | Plugin works only on desktop       |

## Configuration file

The `.create-obsidian-plugin.json` file stores:

- `generatorVersion` — version of the generator that created the project
- `fileHashes` — SHA-256 hashes of generated files for update detection
- `answers` — every answer, which an update reuses
- `customTemplate` — the [custom template](#your-own-templates) directory, if one was used

## Architecture

- **EJS templates** with a partial-based composition system
- **Logicless templates** — no `<% if %>` conditionals; conditional content via partials
- **Two-tier scripts** — standalone has full inline scripts; enhanced wraps obsidian-dev-utils
- **Root configs are thin wrappers** — actual logic lives in `scripts/`

## Sample output

See [Sample Plugin Extended](https://github.com/mnaoumov/obsidian-sample-plugin-extended).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)
