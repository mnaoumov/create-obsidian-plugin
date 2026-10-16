// Docs: Right-to-left > Obsidian CSS helpers and rules for RTL > Icons are mirrored automatically
// https://docs.obsidian.md/Plugins/User+interface/Right-to-left#Icons+are+mirrored+automatically
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Right-to-left.md?plain=1#L120
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".mod-rtl svg.svg-icon.left-icon {\n\ttransform: unset;\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
