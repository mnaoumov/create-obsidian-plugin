// Docs: Build a plugin > Step 5: Update the source code (2)
// https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin#Step+5%3A+Update+the+source+code
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L115
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';
import { Notice } from 'obsidian';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    this.addRibbonIcon('dice', 'Greet', () => {
      new Notice('Hello, world!');
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
