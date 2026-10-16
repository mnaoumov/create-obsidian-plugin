// Docs: Settings > Legacy: imperative display() approach > Available components > Progress bar
// https://docs.obsidian.md/Plugins/User+interface/Settings#Progress+bar
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Settings.md?plain=1#L985
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Setting } from 'obsidian';

async function snippet(context: DocsContext) {
  const containerEl = context.getContainerEl();
  {
    new Setting(containerEl)
      .setName('Progress bar')
      .setDesc('It\'s 50% done')
      .addProgressBar((bar) => bar.setValue(50));
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
