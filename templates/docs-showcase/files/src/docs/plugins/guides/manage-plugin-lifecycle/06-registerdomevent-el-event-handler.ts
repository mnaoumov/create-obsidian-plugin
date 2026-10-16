// Docs: Manage plugin lifecycle > Automatic Resource Management with Component > registerDomEvent(el, event, handler)
// https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle#%60registerDomEvent(el%2C+event%2C+handler)%60
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L109
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    this.registerDomEvent(window, "resize", () => {
    	console.debug("Window resized!");
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
