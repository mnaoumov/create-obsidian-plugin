---
title: See also
description: Other tools that scaffold an Obsidian plugin project, and how this one differs.
sidebar:
  order: 10
---

[My other Obsidian resources](https://github.com/mnaoumov/obsidian-resources)

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
