---
title: Getting started
description: Create a new Obsidian plugin project with one command, and what the wizard asks along the way.
sidebar:
  order: 1
---

## Create a new plugin

Run the generator with the package manager you use:

| Package manager | Runner   | Command                                     |
|-----------------|----------|---------------------------------------------|
| `npm`           | `create` | `npm create @mnaoumov/obsidian-plugin`      |
| `npm`           | `npx`    | `npx @mnaoumov/create-obsidian-plugin`      |
| `pnpm`          | `create` | `pnpm create @mnaoumov/obsidian-plugin`     |
| `pnpm`          | `dlx`    | `pnpm dlx @mnaoumov/create-obsidian-plugin` |
| `yarn`          | `create` | `yarn create @mnaoumov/obsidian-plugin`     |
| `yarn`          | `dlx`    | `yarn dlx @mnaoumov/create-obsidian-plugin` |
| `bun`           | `create` | `bun create @mnaoumov/obsidian-plugin`      |
| `bun`           | `bunx`   | `bunx @mnaoumov/create-obsidian-plugin`     |

This starts an interactive wizard. It asks about your plugin, then about its tooling, and scaffolds the project into a new `obsidian-<plugin id>` folder. At the end it offers to install the dependencies, initialize a `git` repository and create a GitHub repository for you.

To pass flags to the generator through `npm create`, put a `"--"` before them, quoted. See [The -- separator in PowerShell](/create-obsidian-plugin/guides/powershell-separator/) for why the quotes matter.

## What the wizard asks

First, the project's own details:

- the plugin id, name and description;
- your name and GitHub username;
- the default branch, `main` unless you say otherwise. `git init` creates it, and the CI workflow runs on it;
- where people can support you: a funding platform and your username on it, or any URL;
- the path to a test vault's `.obsidian` folder, which each build copies the plugin into. It is written to the project's `.env` as `OBSIDIAN_CONFIG_FOLDER`.

Then the tooling: a preset, and, if you choose to customize, every question listed in [Feature options](/create-obsidian-plugin/guides/feature-options/). The recommended answers are the defaults, so pressing Enter all the way through gives you a working project.

## The Community directory checks

The id, name and description are checked against the rules the Obsidian Community directory's automated review enforces, and a rejected value says which rule it broke. This matters most for the id: the directory reads your `manifest.json` again when you submit, and an id can never be changed once your plugin is published.

Once the answers are in, the generator also checks that no plugin in the directory already uses your id. If the list cannot be fetched, it warns and carries on.

## Next steps

When it finishes, the wizard prints what is left to do, for example:

```bash
cd obsidian-my-tool && npm install && npm run dev
```

[The generated project](/create-obsidian-plugin/guides/generated-project/) describes the files you get and the scripts you can run.

## A finished example

[Sample Plugin Extended](https://github.com/mnaoumov/obsidian-sample-plugin-extended) is a plugin generated with this tool.
