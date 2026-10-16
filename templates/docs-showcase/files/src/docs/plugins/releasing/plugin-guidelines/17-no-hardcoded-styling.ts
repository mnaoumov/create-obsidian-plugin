// Docs: Plugin guidelines > Styling > No hardcoded styling (3)
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#No+hardcoded+styling
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L331
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".warning-container {\n\tcolor: var(--text-normal);\n\tbackground-color: var(--background-modifier-error);\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
