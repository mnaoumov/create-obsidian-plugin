// Docs: Plugin guidelines > Vault > Avoid iterating all files to find a file by its path (3)
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid+iterating+all+files+to+find+a+file+by+its+path
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L242
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    const folderPath = 'folder';
    // or if you want to get a folder
    const folder = this.app.vault.getFolderByPath(folderPath);
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
