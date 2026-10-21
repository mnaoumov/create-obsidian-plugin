// Docs: Manage plugin lifecycle > Creating Your Own Components > Componentized Modal Example
// https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle#Componentized+Modal+Example
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L349
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { App, Component, Modal } from 'obsidian';

class MyModal extends Modal {
	private component: Component;

	public constructor(app: App) {
		super(app);
		this.component = new Component();
		this.component.load();
	}

	onOpen() {
		// Register the keyboard event on the component
		this.component.registerDomEvent(window, "keydown", (evt) => {
			console.debug("Key pressed:", evt.key);
		});
	}

	onClose() {
		// Manually unload the component, which removes the listener
		this.component.unload();
	}
}

export { MyModal };

export async function run(context: DocsContext): Promise<void> {
  context.openModal(new MyModal(context.app));
}
