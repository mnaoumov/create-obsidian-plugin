// Docs: About styling > For themes and snippets
// https://docs.obsidian.md/Reference/CSS+variables/About+styling#For+themes+and+snippets
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Reference/CSS%20variables/About%20styling.md?plain=1#L23
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".theme-dark {\n  --background-primary: #18004F;\n  --background-secondary: #220070;\n}\n\n.theme-light {\n  --background-primary: #ECE4FF;\n  --background-secondary: #D9C9FF;\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
