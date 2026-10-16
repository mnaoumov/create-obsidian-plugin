// Docs: State management > State changes
// https://docs.obsidian.md/Plugins/Editor/State+management#State+changes
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Editor/State%20management.md?plain=1#L10
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

async function snippet(context: DocsContext) {
  {
    let note = '';
    note = 'Heading'
    note = '# Heading'
    note = '## Heading' // How to undo this?
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
