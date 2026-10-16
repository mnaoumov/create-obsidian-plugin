// Docs: Manage plugin lifecycle > Automatic Resource Management with Component
// https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle#Automatic+Resource+Management+with+%60Component%60
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L65
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

// Best: the listener is automatically cleaned up!
class MyPlugin extends Plugin {
	onResize() {
		console.debug("Window resized!");
	}

	onload() {
		this.registerDomEvent(window, "resize", this.onResize);
	}
}

export { MyPlugin };

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(MyPlugin);
}
