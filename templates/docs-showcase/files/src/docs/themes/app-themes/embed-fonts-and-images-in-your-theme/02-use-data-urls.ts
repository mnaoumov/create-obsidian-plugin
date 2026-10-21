// Docs: Embed fonts and images in your theme > Use data URLs (2)
// https://docs.obsidian.md/Themes/App+themes/Embed+fonts+and+images+in+your+theme#Use+data+URLs
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Embed%20fonts%20and%20images%20in%20your%20theme.md?plain=1#L21
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

const css = "h1 {\n  background-image: url(\"data:image/gif;base64,R0lGODdhAQADAPABAP////8AACwAAAAAAQADAAACAgxQADs=\")\n}";

export async function run(context: DocsContext): Promise<void> {
  await context.toggleCss(css);
}
