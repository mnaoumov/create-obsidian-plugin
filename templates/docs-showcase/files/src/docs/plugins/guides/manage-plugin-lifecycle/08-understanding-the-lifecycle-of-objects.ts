// Docs: Manage plugin lifecycle > Understanding The Lifecycle of Objects (2)
// https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle#Understanding+The+Lifecycle+of+Objects
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L160
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Modal } from 'obsidian';

class MyModal extends Modal {
	onKeyDown() {
		console.debug("Key pressed!");
	}

	onOpen() {
		window.addEventListener("keydown", this.onKeyDown);
	}

	onClose() {
		window.removeEventListener("keydown", this.onKeyDown);
	}
}

export { MyModal };

export async function run(context: DocsContext): Promise<void> {
  context.openModal(new MyModal(context.app));
}
