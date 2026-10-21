// Docs: Plugin guidelines > Workspace > Avoid accessing workspace.activeLeaf directly
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+accessing+%60workspace.activeLeaf%60+directly
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L146
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';
import { MarkdownView } from 'obsidian';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);

    // getActiveViewOfType will return null if the active view is null, or if it's not a MarkdownView.
    if (view) {
      // ...
    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
