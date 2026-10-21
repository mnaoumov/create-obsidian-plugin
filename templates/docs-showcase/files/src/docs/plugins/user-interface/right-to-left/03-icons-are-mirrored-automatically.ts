// Docs: Right-to-left > Obsidian CSS helpers and rules for RTL > Icons are mirrored automatically
// https://docs.obsidian.md/Plugins/User+interface/Right-to-left#Icons+are+mirrored+automatically
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Right-to-left.md?plain=1#L120
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = ".mod-rtl svg.svg-icon.left-icon {\n\ttransform: unset;\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
