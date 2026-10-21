// Docs: Commands
// https://docs.obsidian.md/Plugins/User+interface/Commands
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Commands.md?plain=1#L7
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'print-greeting-to-console',
      name: 'Print greeting to console',
      callback: () => {
        console.log('Hey, you!');
      },
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(ExamplePlugin);
}
