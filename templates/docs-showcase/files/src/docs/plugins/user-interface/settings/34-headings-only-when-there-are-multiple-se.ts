// Docs: Settings > Style guide > Headings only when there are multiple sections
// https://docs.obsidian.md/Plugins/User+interface/Settings#Headings+only+when+there+are+multiple+sections
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L800
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

async function snippet(context: DocsContext) {
  {
    return [
      // General — no heading
      { name: 'Default folder', control: { type: 'folder', key: 'folder' } },
      { name: 'Open on launch', control: { type: 'toggle', key: 'openOnLaunch' } },

      // Subsequent sections get headings
      { type: 'group', heading: 'Appearance', items: [/* … */] },
      { type: 'group', heading: 'Advanced', items: [/* … */] },
    ];
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
