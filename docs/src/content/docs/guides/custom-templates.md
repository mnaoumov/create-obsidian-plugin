---
title: Your own templates
description: Layer a directory of your own EJS templates over the built-in ones with --customTemplate.
sidebar:
  order: 7
---

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
- A folder whose name is in parentheses, such as the built-ins' `scripts/(build)/`, only groups templates and is not part of their path. So `scripts/build.ts.ejs` and `scripts/(build)/build.ts.ejs` are the same template, and you may group your own files the same way or not at all.
- `partials` names what your partial files contribute. The names share one namespace with the built-in partials, so a name the generator already uses is refused. Your partials render after the built-in ones at every seam.
- `files` lists the paths you add, without `.ejs`. A built-in path is refused there; to replace one, just place its template.
- `packages` are added to `devDependencies`, and their versions are resolved when you generate, as the built-in ones are.
- `badges` go after the built-in badges, on the same README line.

The directory is checked before any question is asked. A template that nothing would ever emit, a partial nobody declared, a section no template renders, or any other file (except `overlay.json` and a `README.md` of its own) stops the run with the reason.

The directory is recorded in `.create-obsidian-plugin.json`, relative to the project, and an update applies it again. That keeps the files it produced updating cleanly rather than looking hand-edited. Pass `--customTemplate=<dir>` on an update to point at a moved directory, or `--customTemplate=` to stop using one. A recorded directory that is missing stops the update instead of quietly reverting your files to the built-ins.

To use one when creating a plugin:

```bash
npm create @mnaoumov/obsidian-plugin "--" --customTemplate=../my-obsidian-template
```

Keep the quotes around `"--"`; see [The -- separator in PowerShell](/create-obsidian-plugin/guides/powershell-separator/).
