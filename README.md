# Create Obsidian Plugin

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)

A scaffolding CLI that generates [Obsidian](https://obsidian.md/) plugin projects from modern templates. Supports creating new plugins and updating existing ones.

**Documentation: <https://mnaoumov.dev/create-obsidian-plugin/>** — every option and prompt, the generated project, updating, custom templates and more.

## Create a new plugin

```bash
npm create @mnaoumov/obsidian-plugin
```

This walks you through an interactive wizard, then scaffolds the project into a new `obsidian-<plugin id>` folder. pnpm, yarn and bun work too: see [Getting started](https://mnaoumov.dev/create-obsidian-plugin/guides/getting-started/).

Run the same command inside a project it created to [update it](https://mnaoumov.dev/create-obsidian-plugin/guides/updating/) to the latest templates, keeping the files you changed.

## Example

Answer every question up front and skip the prompts:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --pluginId=my-tool --packageManager=npm
```

Keep the quotes around `"--"`: in PowerShell a bare `--` is swallowed before npm sees it. See [The -- separator in PowerShell](https://mnaoumov.dev/create-obsidian-plugin/guides/powershell-separator/). Every option is listed in [Command-line options](https://mnaoumov.dev/create-obsidian-plugin/guides/command-line/).

[Sample Plugin Extended](https://github.com/mnaoumov/obsidian-sample-plugin-extended) is a plugin generated with this tool.

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

### Filing an issue (for AI agents and humans)

Open issues through the [issue forms](https://github.com/mnaoumov/create-obsidian-plugin/issues/new/choose), not as blank issues.

Filing from the CLI or the API (`gh issue create --body`, or an AI agent filing for you) skips the form, and `gh issue create --template` cannot load an issue form. In that case, open the matching form in [`.github/ISSUE_TEMPLATE/`](https://github.com/mnaoumov/create-obsidian-plugin/tree/HEAD/.github/ISSUE_TEMPLATE), copy every field as a `### <label>` heading in the form's order, and fill in each one. Always state the version you used and your operating system.

## My other Obsidian resources

[My other Obsidian resources](https://github.com/mnaoumov/obsidian-resources)

## License

© [Michael Naumov](https://github.com/mnaoumov/)
