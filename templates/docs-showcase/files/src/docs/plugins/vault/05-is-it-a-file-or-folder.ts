// Docs: Vault > Is it a file or folder?
// https://docs.obsidian.md/Plugins/Vault#Is+it+a+file+or+folder%3F
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Vault.md?plain=1#L109
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../host.ts';
import { TFile, TFolder } from 'obsidian';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    const folderOrFile = this.app.vault.getAbstractFileByPath('folderOrFile');

    if (folderOrFile instanceof TFile) {
      console.log('It\'s a file!');
    } else if (folderOrFile instanceof TFolder) {
      console.log('It\'s a folder!');
    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
