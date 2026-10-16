// Docs: Defer views > Accessing your CustomView without reveal (Advanced)
// https://docs.obsidian.md/Plugins/Guides/Defer+views#Accessing+your+%60CustomView%60+without+reveal+(Advanced)
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Guides/Defer%20views.md?plain=1#L74
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { requireApiVersion } from 'obsidian';

async function snippet(context: DocsContext) {
  const workspace = context.app.workspace;
  {
    let leaves = workspace.getLeavesOfType('my-view');
    for (let leaf of leaves) {
      if (requireApiVersion('1.7.2')) {
        await leaf.loadIfDeferred(); // Ensure view is fully loaded
      }
      // perform modifications here...
    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
