// Docs: Site fonts
// https://docs.obsidian.md/Reference/CSS+variables/Publish/Site+fonts
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/CSS%20variables/Publish/Site%20fonts.md?plain=1#L8
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../../host.ts';

const css = "/* @import must always be at the top of your publish.css file */\n@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');\n\nbody {\n  --font-text-theme: 'Poppins';\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
