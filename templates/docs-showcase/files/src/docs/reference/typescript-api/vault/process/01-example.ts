// Docs: process > Example
// https://docs.obsidian.md/Reference/TypeScript+API/Vault/process#Example
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Reference/TypeScript%20API/Vault/process.md?plain=1#L37
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../../host.ts';

async function snippet(context: DocsContext) {
  const app = context.app;
  const file = await context.getFile();
  {
    app.vault.process(file, (data) => {
     return data.replace('Hello', 'World');
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
