---
title: The -- separator in PowerShell
description: npm needs a -- before the generator's own flags, and PowerShell swallows a bare one. Write it quoted, as "--".
sidebar:
  order: 3
---

`npm create` hands every flag after the package name to npm itself, unless a `--` comes first. So with npm, the generator's own flags go after a `--`:

```bash
npm create @mnaoumov/obsidian-plugin "--" --yes --pluginId=my-tool
```

pnpm, yarn and bun pass on what follows the package name without one:

```bash
pnpm create @mnaoumov/obsidian-plugin --yes --pluginId=my-tool
```

## Quote the separator

> [!WARNING]
> In PowerShell, a bare `--` never reaches npm. Write it in quotes, `"--"` or `'--'`.

In PowerShell, `npm` runs `npm.ps1`, a PowerShell script. PowerShell's parameter binder takes a bare `--` as its own end-of-parameters marker when it calls a script, so the separator is gone before npm starts. npm then reads the generator's flags as its own:

- an unknown flag stops the run, with `npm error code EUNKNOWNCONFIG` and `Unknown cli flag: --pluginId`, which reads as if the generator had rejected the flag;
- a flag npm also knows, such as `--help`, is answered by npm. `npm create @mnaoumov/obsidian-plugin -- --help` prints npm's own `npm init` help instead of this generator's.

A quoted `--` is a plain string to PowerShell, so it is passed on, and npm sees the separator.

## Which quotes

| Shell | `--` | `"--"` | `'--'` |
|-------|------|--------|--------|
| bash, zsh and other POSIX shells | works | works | works |
| PowerShell (Windows, macOS, Linux) | **swallowed** | works | works |
| Windows Command Prompt (`cmd.exe`) | works | works | **fails**: npm receives `'--'` with the quotes |

`"--"` is the one spelling that works in all three, so every example on this site uses it. Copy an example into any shell as it is.

The same applies to any npm command that forwards flags, such as `npm run <script> "--" --<flag>` and `npx --no "--" <package> --<flag>`.

## Scripts the generator writes

The script the wizard saves for you ([Saving the answers](/create-obsidian-plugin/guides/command-line/#saving-the-answers-from-an-interactive-run)) is a `.cmd` file on Windows and a `.sh` file elsewhere. Each is run by its own shell, `cmd.exe` or `sh`, never by PowerShell, so it carries a bare `--`. Run it as a file (`.\obsidian-my-tool-create.cmd`) rather than pasting its command line into PowerShell.
