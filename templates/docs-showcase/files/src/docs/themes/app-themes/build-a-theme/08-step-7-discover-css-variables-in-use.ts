// Docs: Build a theme > Step 7: Discover CSS variables in use
// https://docs.obsidian.md/Themes/App+themes/Build+a+theme#Step+7%3A+Discover+CSS+variables+in+use
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L173
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = "body {\n  --ribbon-background: magenta;\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
