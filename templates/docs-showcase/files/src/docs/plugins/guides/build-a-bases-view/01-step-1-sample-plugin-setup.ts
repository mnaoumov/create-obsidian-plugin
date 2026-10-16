// Docs: Build a Bases view > Step 1: Sample plugin setup
// https://docs.obsidian.md/Plugins/Guides/Build+a+Bases+view#Step+1%3A+Sample+plugin+setup
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Guides/Build%20a%20Bases%20view.md?plain=1#L37
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

export default class MyPlugin extends Plugin {
  async onload() {
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(MyPlugin);
}
