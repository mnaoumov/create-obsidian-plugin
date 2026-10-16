// Docs: Mobile development > Platform-specific features
// https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Platform-specific+features
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Getting%20started/Mobile%20development.md?plain=1#L44
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { Platform } from 'obsidian';

async function snippet(context: DocsContext) {
  {
    if (Platform.isIosApp) {
      // ...
    }

    if (Platform.isAndroidApp) {
      // ...
    }
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
