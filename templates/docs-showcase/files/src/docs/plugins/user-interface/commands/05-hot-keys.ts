// Docs: Commands > Hot keys
// https://docs.obsidian.md/Plugins/User+interface/Commands#Hot+keys
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Commands.md?plain=1#L109
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    this.addCommand({
      id: 'example-command',
      name: 'Example command',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'A' }],
      callback: () => {
        console.log('Hey, you!');
      },
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
