// Docs: Status bar
// https://docs.obsidian.md/Plugins/User+interface/Status+bar
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Status%20bar.md?plain=1#L6
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

export default class ExamplePlugin extends Plugin {
  async onload() {
    const item = this.addStatusBarItem();
    item.createEl('span', { text: 'Hello from the status bar 👋' });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(ExamplePlugin);
}
