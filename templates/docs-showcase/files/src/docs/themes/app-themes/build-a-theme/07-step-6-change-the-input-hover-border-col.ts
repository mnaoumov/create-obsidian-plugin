// Docs: Build a theme > Step 6: Change the input hover border color
// https://docs.obsidian.md/Themes/App+themes/Build+a+theme#Step+6%3A+Change+the+input+hover+border+color
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/da382ee87130bc0aba10f6309ebc0f67a4ed4da0/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L134
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ":root {\n   --input-hover-border-color: red;\n/* Change from Black to Red */\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
