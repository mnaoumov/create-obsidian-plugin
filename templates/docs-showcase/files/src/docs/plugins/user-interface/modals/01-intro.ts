// Docs: Modals
// https://docs.obsidian.md/Plugins/User+interface/Modals
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Modals.md?plain=1#L3
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { App, Modal } from 'obsidian';

export class ExampleModal extends Modal {
  constructor(app: App) {
    super(app);
	this.setContent('Look at me, I\'m a modal! 👀')
  }
}

export async function run(context: DocsContext): Promise<void> {
  context.openModal(new ExampleModal(context.app));
}
