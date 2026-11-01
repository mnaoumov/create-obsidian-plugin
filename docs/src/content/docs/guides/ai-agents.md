---
title: Notes for AI agents
description: What an AI coding agent needs to know to run this generator, and what the generated project tells agents about filing issues.
sidebar:
  order: 9
---

## Running the generator from an agent

An agent has no terminal to answer prompts in, so give it every answer up front and add `--yes`:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --mode=create --pluginId=my-tool --pluginName="My Tool" --pluginDescription="Does one thing well." --authorName="John Doe" --authorGitHubName=johndoe
```

- `--yes` never waits for input. A question no flag answers stops the run with an error naming the flag to add, so an agent sees exactly what is missing rather than hanging.
- `--mode=create` or `--mode=update` is required under `--yes` when the current directory already holds a generated project, and `--force` when the target folder already exists.
- `--yes` installs, formats and commits nothing. The closing `Next steps` line lists what is left to run.
- `--help` prints every answer and the values it accepts, so the agent can read the options rather than guess them.
- Agents on Windows often run commands through PowerShell. Keep the quotes around `"--"`, or npm reads the flags as its own; see [The -- separator in PowerShell](/create-obsidian-plugin/guides/powershell-separator/).

## Filing an issue against this generator

Open issues through the [issue forms](https://github.com/mnaoumov/create-obsidian-plugin/issues/new/choose), not as blank issues.

Filing from the CLI or the API (`gh issue create --body`, or an AI agent filing for you) skips the form, and `gh issue create --template` cannot load an issue form. In that case, open the matching form in [`.github/ISSUE_TEMPLATE/`](https://github.com/mnaoumov/create-obsidian-plugin/tree/HEAD/.github/ISSUE_TEMPLATE), copy every field as a `### <label>` heading in the form's order, and fill in each one. Always state the version you used and your operating system.

## What the generated project tells agents

With the [issue forms](/create-obsidian-plugin/guides/issue-forms/), the generated README and `CONTRIBUTING.md` carry the same **Filing an issue (for AI agents and humans)** section for your plugin, asking for the plugin version, the Obsidian version and the operating system.

The project has no `AGENTS.md`. A generated one could only restate the README about code nobody has written yet, and it would need maintaining from the moment it existed. Write your own once the plugin has something to say.
