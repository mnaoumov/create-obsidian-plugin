// Docs: Build a Publish theme
// https://docs.obsidian.md/Themes/Obsidian+Publish+themes/Build+a+Publish+theme
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/Obsidian%20Publish%20themes/Build%20a%20Publish%20theme.md?plain=1#L13
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".published-container {\n  --page-width: 800px;\n  --page-side-padding: 48px;\n\n  /* ... CSS variables for Publish that do not change when light or dark mode is enabled. They sometimes link to color variables in .theme-light or .theme-dark */\n}\n\n.theme-light {\n  --background-primary: #ebf2ff;\n  --h1-color: #000000;\n\n  /* ... CSS color variables for when light mode is enabled */\n}\n.theme-dark {\n  --background-primary: #1f2a3f;\n  --h1-color: #ffffff;\n\n  /* ... CSS color variables for when dark mode is enabled */\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
