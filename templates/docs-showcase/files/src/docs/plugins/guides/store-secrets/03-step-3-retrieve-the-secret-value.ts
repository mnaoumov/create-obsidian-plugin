// Docs: Store secrets > Step 3: Retrieve the secret value
// https://docs.obsidian.md/Plugins/Guides/Store+secrets#Step+3%3A+Retrieve+the+secret+value
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Guides/Store%20secrets.md?plain=1#L89
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';

async function snippet(this: DocsThis, context: DocsContext) {
  const app = context.app;
  {
    const secret = app.secretStorage.getSecret(this.settings.mySetting);
    if (secret) { // secret value might be null

    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
