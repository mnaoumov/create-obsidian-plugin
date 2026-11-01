---
title: Updating an existing project
description: Run the generator again inside a project it created, to take the latest templates without losing your edits.
sidebar:
  order: 6
---

Run the same command inside a project previously created with this tool:

```bash
npm create @mnaoumov/obsidian-plugin
```

The updater:

- detects the existing project by its `.create-obsidian-plugin.json`;
- asks whether you want to change any of the saved answers;
- compares each file's hash with the one it recorded, to find the files you have changed;
- updates the unmodified files to the latest template version;
- skips the files you have customized, with a warning;
- creates any new files the templates have added.

To update without being asked anything, keeping the saved answers:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --mode=update
```

Flags given beside it are applied over the saved answers, for example `--styling=scss`. Keep the quotes around `"--"`; see [The -- separator in PowerShell](/create-obsidian-plugin/guides/powershell-separator/).

## Files you have edited

A file you have edited is skipped on every update, not only the next one: the generator keeps the hash of what it wrote, not of your version. It rejoins updates when its content matches a template render again, or when you delete it, which is how to take the new version of a file you changed.

A file at a path the previous run never wrote, such as a template new in this release, is treated as yours too, unless it already matches the render.

Files your formatter rewrote are not counted as edits. On an update the generator runs the project's formatter over each new render before comparing, and formats what it writes, so `format:check` stays green.

## The configuration file

`.create-obsidian-plugin.json` stores:

- `generatorVersion`: the version of the generator that last wrote the project;
- `fileHashes`: the SHA-256 hash of each generated file, for the update to compare against;
- `answers`: every answer, which the update reuses;
- `customTemplate`: the [custom template](/create-obsidian-plugin/guides/custom-templates/) directory, if one was used.

Commit it with the rest of the project.
