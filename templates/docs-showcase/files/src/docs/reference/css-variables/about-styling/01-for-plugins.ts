// Docs: About styling > For plugins
// https://docs.obsidian.md/Reference/CSS+variables/About+styling#For+plugins
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Reference/CSS%20variables/About%20styling.md?plain=1#L11
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".todo-list {\n  background-color: var(--background-secondary);\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
