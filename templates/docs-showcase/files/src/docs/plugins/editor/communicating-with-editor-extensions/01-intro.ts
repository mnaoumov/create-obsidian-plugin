// Docs: Communicating with editor extensions
// https://docs.obsidian.md/Plugins/Editor/Communicating+with+editor+extensions
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Communicating%20with%20editor%20extensions.md?plain=1#L5
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { EditorView } from '@codemirror/view';

async function snippet(context: DocsContext) {
  const view = await context.getMarkdownView();
  {
    // @ts-expect-error, not typed
    const editorView = view.editor.cm as EditorView;
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
