// Docs: Optimize plugin load time > Pitfalls > Listening to vault.on('create') > Option A. Check if the layout is ready
// https://docs.obsidian.md/Plugins/Guides/Optimize+plugin+load+time#Option+A.+Check+if+the+layout+is+ready
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Optimize%20plugin%20load%20time.md?plain=1#L36
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

class MyPlugin extends Plugin {
    onload() {
        this.registerEvent(this.app.vault.on('create', this.onCreate, this));
    }

	onCreate() {
	    if (!this.app.workspace.layoutReady) {
	      // Workspace is still loading, do nothing
	      return;
	    }
		// ...
	}
}

export { MyPlugin };

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(MyPlugin);
}
