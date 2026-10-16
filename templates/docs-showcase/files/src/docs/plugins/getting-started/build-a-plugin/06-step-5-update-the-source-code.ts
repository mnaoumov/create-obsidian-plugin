// Docs: Build a plugin > Step 5: Update the source code
// https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin#Step+5%3A+Update+the+source+code
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L109
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Notice, Plugin } from 'obsidian';

async function snippet(context: DocsContext) {
  {

  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
