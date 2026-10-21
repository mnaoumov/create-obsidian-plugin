// Docs: Decorations > Providing decorations > Widgets (2)
// https://docs.obsidian.md/Plugins/Editor/Decorations#Widgets
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Decorations.md?plain=1#L76
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Decoration } from '@codemirror/view';
import { EmojiWidget } from './01-widgets.ts';

const decoration = Decoration.replace({
  widget: new EmojiWidget()
});

export { decoration };

export async function run(context: DocsContext): Promise<void> {
  context.report("Declares decoration. It compiles against the API, and there is nothing in it to run on its own.");
}
