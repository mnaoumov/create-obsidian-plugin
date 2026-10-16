// Docs: Right-to-left > Make plugins and themes agnostic of language direction > Use fallback values when necessary
// https://docs.obsidian.md/Plugins/User+interface/Right-to-left#Use+fallback+values+when+necessary
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Right-to-left.md?plain=1#L69
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".supported,\n.unsupported {\n  /* this won't run */\n}\n\n.supported {\n  /* this will run */\n}\n\n.unsupported {\n  /* this won't run */\n}\n\n@supports selector(:dir(*)) {\n  /* will run if :dir() is supported */\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
