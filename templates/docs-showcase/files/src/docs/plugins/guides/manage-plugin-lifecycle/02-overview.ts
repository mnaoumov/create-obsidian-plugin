// Docs: Manage plugin lifecycle > Overview (2)
// https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle#Overview
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L40
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

// Better: but more tedious and error-prone.
class MyPlugin extends Plugin {
	onResize() {
		console.debug("Window resized!");
	}

	onload() {
		window.addEventListener("resize", this.onResize);
	}

	onunload() {
		window.removeEventListener("resize", this.onResize);
	}
}

export { MyPlugin };

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(MyPlugin);
}
