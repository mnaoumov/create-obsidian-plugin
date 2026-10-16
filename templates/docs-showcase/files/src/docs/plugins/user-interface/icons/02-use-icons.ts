// Docs: Icons > Use icons (2)
// https://docs.obsidian.md/Plugins/User+interface/Icons#Use+icons
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Icons.md?plain=1#L26
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = "div {\n  --icon-size: var(--icon-size-m);\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
