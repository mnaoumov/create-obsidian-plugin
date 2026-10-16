// Docs: Vault > Modify files
// https://docs.obsidian.md/Plugins/Vault#Modify+files
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Vault.md?plain=1#L67
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../host.ts';
import { TFile, Vault } from 'obsidian';

function writeCurrentDate(vault: Vault, file: TFile): Promise<void> {
  return vault.modify(file, `Today is ${new Intl.DateTimeFormat().format(new Date())}.`);
}

export { writeCurrentDate };

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await writeCurrentDate(context.app.vault, await context.getFile()), 'writeCurrentDate()');
}
