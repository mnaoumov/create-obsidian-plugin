// Docs: Decorations > Providing decorations > Widgets
// https://docs.obsidian.md/Plugins/Editor/Decorations#Widgets
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Editor/Decorations.md?plain=1#L60
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { EditorView, WidgetType } from '@codemirror/view';

export class EmojiWidget extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    const div = document.createElement('span');

    div.innerText = '👉';

    return div;
  }
}

export async function run(context: DocsContext): Promise<void> {
  context.report("Declares EmojiWidget. It compiles against the API, and there is nothing in it to run on its own.");
}
