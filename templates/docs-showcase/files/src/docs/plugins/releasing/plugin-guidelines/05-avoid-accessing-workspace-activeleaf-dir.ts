// Docs: Plugin guidelines > Workspace > Avoid accessing workspace.activeLeaf directly (2)
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+accessing+%60workspace.activeLeaf%60+directly
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/da382ee87130bc0aba10f6309ebc0f67a4ed4da0/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L157
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    const editor = this.app.workspace.activeEditor?.editor;

    if (editor) {
        // ...
    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
