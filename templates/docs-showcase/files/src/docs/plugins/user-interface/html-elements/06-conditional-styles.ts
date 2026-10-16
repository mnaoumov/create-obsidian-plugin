// Docs: HTML elements > Style your elements > Conditional styles
// https://docs.obsidian.md/Plugins/User+interface/HTML+elements#Conditional+styles
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L81
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

async function snippet(context: DocsContext) {
  const element = context.getContainerEl();
  {
    element.toggleClass('danger', status === 'error');
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
