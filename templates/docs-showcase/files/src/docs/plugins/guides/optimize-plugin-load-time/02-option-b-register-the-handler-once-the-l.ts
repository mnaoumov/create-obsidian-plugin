// Docs: Optimize plugin load time > Pitfalls > Listening to vault.on('create') > Option B. Register the handler once the layout is ready
// https://docs.obsidian.md/Plugins/Guides/Optimize+plugin+load+time#Option+B.+Register+the+handler+once+the+layout+is+ready
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Optimize%20plugin%20load%20time.md?plain=1#L54
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Plugin } from 'obsidian';

class MyPlugin extends Plugin {
    onload() {
	    this.app.workspace.onLayoutReady(() => {
	        this.registerEvent(this.app.vault.on('create', this.onCreate, this));
	    });
    }

	onCreate() {
		// ...
	}
}

export { MyPlugin };

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(MyPlugin);
}
