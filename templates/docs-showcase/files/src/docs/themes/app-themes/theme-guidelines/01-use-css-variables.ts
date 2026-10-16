// Docs: Theme guidelines > Use CSS variables
// https://docs.obsidian.md/Themes/App+themes/Theme+guidelines#Use+CSS+variables
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Themes/App%20themes/Theme%20guidelines.md?plain=1#L11
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ":root {\n  --input-focus-border-color: Highlight;\n}\n\nbody {\n  --font-text-size: 18px;\n}\n\n.theme-light {\n  --background-primary: white;\n}\n\n.theme-dark {\n  --background-primary: black;\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
