// Docs: Settings > Control types > Number
// https://docs.obsidian.md/Plugins/User+interface/Settings#Number
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L214
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { SettingDefinitionItem } from 'obsidian';

async function snippet(context: DocsContext) {
  const value: SettingDefinitionItem = (
    {
      name: 'Cache size (MB)',
      control: { type: 'number', key: 'cacheMb', min: 1, max: 500, defaultValue: 50 },
    }
  );
  await context.showSettingDefinitions([value]);
}

export async function run(context: DocsContext): Promise<void> {
  await snippet(context);
}
