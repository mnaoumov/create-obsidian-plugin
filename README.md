# Create Obsidian Plugin

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)

A scaffolding CLI that generates [Obsidian](https://obsidian.md/) plugin projects from modern templates. Supports creating new plugins and updating existing ones.

**[Documentation site](https://mnaoumov.dev/create-obsidian-plugin/)** — every option and prompt, the generated project, updating, custom templates and more.

## Create a new plugin

```bash
npm create @mnaoumov/obsidian-plugin
```

This walks you through an interactive wizard, then scaffolds the project into a new `obsidian-<plugin id>` folder. `pnpm`, `yarn` and `bun` work too: see [Getting started](https://mnaoumov.dev/create-obsidian-plugin/guides/getting-started/).

Run the same command inside a project it created to [update it](https://mnaoumov.dev/create-obsidian-plugin/guides/updating/) to the latest templates, keeping the files you changed.

## Example

Answer every question up front and skip the prompts:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --pluginId=my-tool --packageManager=npm
```

Keep the quotes around `"--"`: in `PowerShell` a bare `--` is swallowed before `npm` sees it. See [The -- separator in PowerShell](https://mnaoumov.dev/create-obsidian-plugin/guides/powershell-separator/). Every option is listed in [Command-line options](https://mnaoumov.dev/create-obsidian-plugin/guides/command-line/).

[Sample Plugin Extended](https://github.com/mnaoumov/obsidian-sample-plugin-extended) is a plugin generated with this tool.

## See also

[My other Obsidian resources](https://mnaoumov.dev/obsidian/)

| Tool | Features | How `create-obsidian-plugin` differs |
| --- | --- | --- |
| [`@aoout/create-obsidian-plugin`](https://www.npmjs.com/package/@aoout/create-obsidian-plugin) | `npm create` wizard, forked from zephraph's `create-obsidian-plugin`; `i18next`; a tag-triggered release workflow; a desktop-only option; `git init` and an optional `GitHub` repository | Same goal; adds: presets; a choice of bundler, UI framework, linter, formatter and test runner; an update in place that keeps the files you edited; `--yes` and answers export |
| [`cookiecutter-obsidian-plugin`](https://github.com/serafinovsky/cookiecutter-obsidian-plugin) | A Python `cookiecutter` template; TypeScript, `esbuild`, `eslint`, `prettier`; optional `vitest` and i18n; a release workflow | Same goal; runs on Node.js through `npm create`, with no Python; adds: presets; five bundlers; UI frameworks; an update in place |
| [`create-obsidian-plugin`](https://www.npmjs.com/package/create-obsidian-plugin) | The `npm init obsidian-plugin` wizard by zephraph; asks for the id and name; a TypeScript plugin whose `dev` and `build` scripts run `obsidian-plugin-cli` | Same goal; adds: presets; a tooling choice in each category; an update in place; `--yes` and answers export |
| [`create-obsidian-plugin-pnpm`](https://www.npmjs.com/package/create-obsidian-plugin-pnpm) | An `npm create` scaffolder that copies one fixed template; `pnpm`, strict TypeScript, `esbuild`, `eslint`; CI and draft-release workflows; a declarative settings example | Same goal; adds: `npm`, `yarn` and `bun`; presets; a choice of bundler, UI framework, linter, formatter and test runner; an update in place |
| [`dsebastien/obsidian-plugin-template`](https://github.com/dsebastien/obsidian-plugin-template) | A `GitHub` template repository; `bun`, strict TypeScript, `tailwindcss` 4, `eslint`, `prettier`, `husky` with `lint-staged`, `commitizen`; CI and release workflows | A generator rather than a template you copy and rename by hand; fills in your plugin's identity from prompts or flags; a choice in each tooling category; an update in place |
| [`generator-obsidian-plugin`](https://github.com/mnaoumov/generator-obsidian-plugin) (my tool) | A Yeoman generator (`yo obsidian-plugin`); `obsidian-typings`, `eslint`, `cspell`, `dprint`, `obsidian-dev-utils` scripts; `svelte` and `react` examples; `sass` | Supersedes it; needs no global `yo`; adds: presets; a choice in each tooling category; an update in place that keeps the files you edited; `--yes` |
| [`nolebase/obsidian-plugin-template`](https://github.com/nolebase/obsidian-plugin-template) | A `GitHub` template repository; TypeScript, `unbuild`, `eslint`, `cspell`, `pnpm`; publishing on release | A generator rather than a template you copy and rename; five bundlers, `unbuild` not among them; UI frameworks; an update in place |
| [`obsidianmd/obsidian-sample-plugin`](https://github.com/obsidianmd/obsidian-sample-plugin) | Obsidian's official template repository; TypeScript, `esbuild`, `eslint` with `eslint-plugin-obsidianmd`, `npm`; sample code | Extends it: the `official-sample` preset copies it with your id, name, author, description and license holder filled in, and can update it later; the other presets add a choice of tooling |

Last searched for similar tools on 2026-11-01.

## Changelog

All notable changes to this project will be documented in the [CHANGELOG](./CHANGELOG.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

### Filing an issue (for AI agents and humans)

Open issues through the [issue forms](https://github.com/mnaoumov/create-obsidian-plugin/issues/new/choose), not as blank issues.

Filing from the CLI or the API (`gh issue create --body`, or an AI agent filing for you) skips the form, and `gh issue create --template` cannot load an issue form. In that case, open the matching form in [`.github/ISSUE_TEMPLATE/`](https://github.com/mnaoumov/create-obsidian-plugin/tree/HEAD/.github/ISSUE_TEMPLATE), copy every field as a `### <label>` heading in the form's order, and fill in each one. Always state the version you used and your operating system.

## License

© [Michael Naumov](https://github.com/mnaoumov/)
