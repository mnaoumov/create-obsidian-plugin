// Docs: Best practices for Publish themes > Small screens and mobile devices
// https://docs.obsidian.md/Themes/Obsidian+Publish+themes/Best+practices+for+Publish+themes#Small+screens+and+mobile+devices
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/Obsidian%20Publish%20themes/Best%20practices%20for%20Publish%20themes.md?plain=1#L41
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = "@media screen and (min-width: 1000px) {\n  /* ... rules and variables for screens larger than tablet */\n}\n@media screen and (max-width: 1000px) {\n  /* ... rules and variables for tablet devices and smaller */\n}\n@media screen and (max-width: 750px) {\n  /* ... rules and variables for mobile devices and smaller */\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
