// Docs: Settings > Control types > Toggle
// https://docs.obsidian.md/Plugins/User+interface/Settings#Toggle
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/da382ee87130bc0aba10f6309ebc0f67a4ed4da0/en/Plugins/User%20interface/Settings.md?plain=1#L190
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { SettingDefinitionItem } from 'obsidian';

async function snippet(context: DocsContext) {
  const value: SettingDefinitionItem = (
    { name: 'Open in foreground', control: { type: 'toggle', key: 'openInForeground' } }
  );
  await context.showSettingDefinitions([value]);
}

export async function run(context: DocsContext): Promise<void> {
  await snippet(context);
}
