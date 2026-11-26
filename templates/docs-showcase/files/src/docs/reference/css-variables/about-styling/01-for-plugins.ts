// Docs: About styling > For plugins
// https://docs.obsidian.md/Reference/CSS+variables/About+styling#For+plugins
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/da382ee87130bc0aba10f6309ebc0f67a4ed4da0/en/Reference/CSS%20variables/About%20styling.md?plain=1#L11
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".todo-list {\n  background-color: var(--background-secondary);\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
