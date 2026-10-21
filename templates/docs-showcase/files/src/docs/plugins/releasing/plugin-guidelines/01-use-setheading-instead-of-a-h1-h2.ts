// Docs: Plugin guidelines > UI text > Use setHeading instead of a <h1>, <h2>
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+%60setHeading%60+instead+of+a+%60%3Ch1%3E%60%2C+%60%3Ch2%3E%60
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L73
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Setting } from 'obsidian';

async function snippet(context: DocsContext) {
  const containerEl = context.getContainerEl();
  {
    new Setting(containerEl).setName('your heading title').setHeading();
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
