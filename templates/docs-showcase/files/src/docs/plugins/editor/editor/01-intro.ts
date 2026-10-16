// Docs: Editor
// https://docs.obsidian.md/Plugins/Editor/Editor
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Editor/Editor.md?plain=1#L7
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';
import { MarkdownView } from 'obsidian';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);

    // Make sure the user is editing a Markdown file.
    if (view) {
    	const cursor = view.editor.getCursor();

    	// ...
    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
