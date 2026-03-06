# Create Obsidian Plugin

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)
[![GitHub release](https://img.shields.io/github/v/release/mnaoumov/create-obsidian-plugin)](https://github.com/mnaoumov/create-obsidian-plugin/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/create-obsidian-plugin/total)](https://github.com/mnaoumov/create-obsidian-plugin/releases)

Create and update Obsidian plugins from modern templates.

## Create a new plugin

```bash
npm create @mnaoumov/obsidian-plugin
```

This walks you through an interactive wizard to scaffold a new Obsidian plugin project with optional post-scaffold actions (npm install, git init, GitHub repo creation).

## Update an existing plugin

Run the same command inside a project previously created with this tool:

```bash
npx @mnaoumov/create-obsidian-plugin
```

The updater will:

- Detect the existing project via `.create-obsidian-plugin.json`
- Compare file hashes to detect local modifications
- Update unmodified files to the latest template version
- Skip files you've customized (with a warning)
- Create any new files added to the template

## Features of the generated template

- [Obsidian Extended Typings](https://github.com/Fevol/obsidian-typings/) for internal [Obsidian](https://obsidian.md/) API.
- Code style is forced via [`ESLint`](https://eslint.org/).
- Spell checking is forced via [`CSpell`](https://cspell.org/).
- Code formatting is forced via [`dprint`](https://dprint.dev/).
- CLI commands and code helpers from [Obsidian Dev Utils](https://github.com/mnaoumov/obsidian-dev-utils).
- Supports [Svelte](https://svelte.dev/) components.
- Supports [React](https://react.dev) components.
- Supports [SASS](https://sass-lang.com/) for CSS pre-processing.

## Sample output

See [Sample Plugin Extended](https://github.com/mnaoumov/obsidian-sample-plugin-extended).

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

MIT © [Michael Naumov](https://github.com/mnaoumov/)
