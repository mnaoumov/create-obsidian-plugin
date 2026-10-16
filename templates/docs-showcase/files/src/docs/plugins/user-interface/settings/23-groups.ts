// Docs: Settings > Groups
// https://docs.obsidian.md/Plugins/User+interface/Settings#Groups
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Settings.md?plain=1#L499
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { SettingDefinitionItem } from 'obsidian';

async function snippet(context: DocsContext) {
  const value: SettingDefinitionItem = (
    {
      type: 'group',
      heading: 'Advanced',
      items: [
        { name: 'Debug logging', control: { type: 'toggle', key: 'debug' } },
        { name: 'Cache size (MB)', control: { type: 'number', key: 'cacheMb', min: 1 } },
      ],
    }
  );
  await context.showSettingDefinitions([value]);
}

export async function run(context: DocsContext): Promise<void> {
  await snippet(context);
}
