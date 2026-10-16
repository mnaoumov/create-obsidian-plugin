// Docs: Communicating with editor extensions > State field
// https://docs.obsidian.md/Plugins/Editor/Communicating+with+editor+extensions#State+field
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Editor/Communicating%20with%20editor%20extensions.md?plain=1#L37
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';
import { EditorView } from '@codemirror/view';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    this.addCommand({
    	id: 'example-editor-command',
    	name: 'Example editor command',
    	editorCallback: (editor, view) => {
    		// @ts-expect-error, not typed
    		const editorView = view.editor.cm as EditorView;

    		editorView.dispatch({
    			effects: [
    				// ...
    			],
    		});
    	},
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
