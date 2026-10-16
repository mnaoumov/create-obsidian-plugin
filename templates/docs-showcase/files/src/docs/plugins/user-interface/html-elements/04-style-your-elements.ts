// Docs: HTML elements > Style your elements
// https://docs.obsidian.md/Plugins/User+interface/HTML+elements#Style+your+elements
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L47
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".book {\n  border: 1px solid var(--background-modifier-border);\n  padding: 10px;\n}\n\n.book__title {\n  font-weight: 600;\n}\n\n.book__author {\n  color: var(--text-muted);\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
