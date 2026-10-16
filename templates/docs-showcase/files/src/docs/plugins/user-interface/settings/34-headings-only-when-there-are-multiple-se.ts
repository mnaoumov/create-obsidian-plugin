// Docs: Settings > Style guide > Headings only when there are multiple sections
// https://docs.obsidian.md/Plugins/User+interface/Settings#Headings+only+when+there+are+multiple+sections
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Settings.md?plain=1#L800
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
