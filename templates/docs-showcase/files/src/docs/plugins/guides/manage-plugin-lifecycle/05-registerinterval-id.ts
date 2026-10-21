// Docs: Manage plugin lifecycle > Automatic Resource Management with Component > registerInterval(id)
// https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle#%60registerInterval(id)%60
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L98
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    const id = window.setInterval(() => {
    	console.debug("Periodic task running...");
    }, 1000);
    this.registerInterval(id);
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
