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

### Presets

| Option | Description |
|--------|-------------|
| **Standalone** | Self-contained scripts with no external runtime dependencies |
| **Enhanced** | One-liner wrapper scripts powered by [obsidian-dev-utils](https://github.com/mnaoumov/obsidian-dev-utils) |
| **Demo** | Full-featured demo showcasing all capabilities |

### Build systems

| Option | Description |
|--------|-------------|
| **esbuild** | Fast bundler with plugin ecosystem |
| **Rollup** | Tree-shaking bundler with rich plugin system |
| **Vite** | Modern dev server and build tool |
| **Webpack** | Widely-used bundler with loaders and plugins |
| **Parcel** | Zero-config bundler |

### UI frameworks

| Option | Description |
|--------|-------------|
| **React** | Component library with JSX |
| **Preact** | Lightweight React alternative |
| **Svelte** | Compiler-based reactive framework |
| **Vue** | Progressive framework with SFC support |
| **Solid** | Fine-grained reactive framework |
| **Lit** | Web components with decorators |
| **None** | Vanilla TypeScript |

### Linters

| Option | Description |
|--------|-------------|
| **ESLint** | Industry standard for JavaScript/TypeScript |
| **Biome** | Fast all-in-one toolchain |
| **None** | No linting |

### Formatters

| Option | Description |
|--------|-------------|
| **Prettier** | Opinionated code formatter |
| **dprint** | Fast formatter written in Rust |
| **Biome** | Integrated formatting via Biome |
| **None** | No formatting |

### Styling

| Option | Description |
|--------|-------------|
| **CSS** | Plain CSS |
| **SCSS** | Sass preprocessor |
| **PostCSS** | CSS transformations with plugins |
| **Tailwind CSS** | Utility-first CSS framework |
| **CSS Modules** | Scoped CSS with type declarations |
| **None** | No styling setup |

### Test runners

| Option | Description |
|--------|-------------|
| **Vitest** | Fast Vite-native test runner |
| **Jest** | Full-featured test framework |
| **None** | No unit testing |

### E2E test runners

| Option | Description |
|--------|-------------|
| **wdio-obsidian** | WebdriverIO with Obsidian service |
| **obsidian-test** | Embedded Obsidian test runner |
| **None** | No E2E testing |

### Editor extensions

| Option | Description |
|--------|-------------|
| **CodeMirror** | StateField, ViewPlugin, Widget, EditorSuggest samples |
| **None** | No editor extensions |

### Commit linting

| Option | Description |
|--------|-------------|
| **Conventional Commits** | commitlint + husky + lint-staged |
| **None** | No commit linting |

### Hot reload

| Option | Description |
|--------|-------------|
| **Hot Reload Plugin** | Creates `.hotreload` marker for [pjeby/hot-reload](https://github.com/pjeby/hot-reload) |
| **None** | No hot reload support |

### Internationalization

| Option | Description |
|--------|-------------|
| **i18next** | Popular i18n framework with JSON translations |
| **typesafe-i18n** | Type-safe i18n with auto-generated types |
| **None** | No internationalization |

### Additional options

- **Spell checker**: CSpell or none
- **Markdown linter**: markdownlint or none
- **GitHub Actions**: CI + Release, CI only, or none
- **GitHub issue templates**: Bug and feature templates or none
- **GitHub funding**: FUNDING.yml or none
- **WASM support**: WebAssembly module support or none
- **Platform support**: Desktop and mobile, desktop only, or mobile only
- **API subset**: Official API or with unofficial typings
- **Package manager**: npm, pnpm, yarn, or bun

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

MIT © [Michael Naumov](https://github.com/mnaoumov/)
