---
title: Command-line options
description: Answer every question up front with flags or an answers file, so generation can be scripted and repeated.
sidebar:
  order: 2
---

Every question the wizard asks can be answered up front instead, which is what lets generation be scripted and repeated.

## Options

| Option | What it does |
|--------|--------------|
| `-y`, `--yes` | Take the default for every unanswered question, and skip the post-scaffold prompts, so nothing is installed, formatted or committed. The closing `Next steps` line lists what is left, including `format` on `prettier` and `biome`, which the project's own `format:check` fails until it has run once. It never asks anything: a question no flag answers stops the run with an error naming the flag |
| `--mode=create\|update` | Create a new plugin, or update the project in the current directory, without being asked which. Under `--yes` it is required when the current directory holds a `.create-obsidian-plugin.json` |
| `--force` | Scaffold into an `obsidian-<pluginId>` directory that already exists, instead of being asked. Under `--yes` it is required when that directory exists |
| `-h`, `--help` | List every option, including the accepted values for each answer |
| `--answersFile=<path>` | Read answers from a JSON file |
| `--customTemplate=<dir>` | Layer your own templates over the built-in ones. See [Your own templates](/create-obsidian-plugin/guides/custom-templates/) |
| `--latest` | With `--preset=official-sample`: copy the official sample plugin as it is upstream today, rather than the snapshot this release ships. See [Official sample plugin](/create-obsidian-plugin/guides/feature-options/#official-sample-plugin) |
| `--<answer>=<value>` | Set one answer, e.g. `--packageManager=yarn`. `--help` lists every answer and the values it accepts |

## Passing the flags

`npm` needs a `--` before the generator's flags, and `pnpm`, `yarn` and `bun` do not:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --pluginId=my-tool --packageManager=yarn
pnpm create @mnaoumov/obsidian-plugin --yes --pluginId=my-tool --packageManager=pnpm
```

> [!WARNING]
> Keep the quotes around `"--"`. A bare `--` is swallowed by `PowerShell`, so `npm` reads the flags as its own. See [The -- separator in PowerShell](/create-obsidian-plugin/guides/powershell-separator/).

## Which answer wins

Answers are applied in order, so the most specific wins: the built-in defaults, then the answers saved in an existing project, then `--answersFile`, then individual flags. An answer given this way is not asked about again. On an update, `--yes` reuses the project's saved answers with any flags applied over them, instead of asking whether to change them.

## The answers file

The answers file is a JSON object using the same names as the flags. It also accepts a whole `.create-obsidian-plugin.json`, so you can point it at an existing project to scaffold another one like it:

```json
{
  "preset": "all-in-one",
  "bundler": "esbuild",
  "packageManager": "npm",
  "pluginId": "my-tool"
}
```

## Invalid input

Invalid input is refused rather than quietly ignored:

- an unknown answer;
- a value outside what a question accepts;
- a plugin id, name or description the wizard itself would reject;
- `--currentYear`, which the generator computes rather than asks for;
- `--bundler` or `--uiFramework` beside `--preset=demo`, which picks both itself;
- a tooling flag beside `--preset=official-sample`, which takes upstream's tooling as it is.

## Saving the answers from an interactive run

At the end of the wizard, before scaffolding, you can save what you just answered, in either form:

- a runnable script, `obsidian-<plugin id>-create.cmd` on Windows and `obsidian-<plugin id>-create.sh` elsewhere;
- an answers file, `obsidian-<plugin id>-answers.json`.

You can save both and then generate: saving does not end the run. Every answer is written, not only the ones that differ from a default, so the recipe keeps producing the same project after a release changes a default.

The saved script carries a bare `--`, because it is run by `cmd.exe` or `sh` rather than by `PowerShell`. Run it as a file. To run the answers file instead:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --mode=create --answersFile=obsidian-my-tool-answers.json
```
