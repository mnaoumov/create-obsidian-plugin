// Docs: Settings > Validating input
// https://docs.obsidian.md/Plugins/User+interface/Settings#Validating+input
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/User%20interface/Settings.md?plain=1#L288
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { SettingDefinitionItem } from 'obsidian';

async function snippet(context: DocsContext) {
  const value: SettingDefinitionItem = (
    {
      name: 'File extension',
      control: {
        type: 'text',
        key: 'extension',
        validate: (value) =>
          /\s/.test(value) ? 'Extension cannot contain spaces.' : undefined,
      },
    }
  );
  await context.showSettingDefinitions([value]);
}

export async function run(context: DocsContext): Promise<void> {
  await snippet(context);
}
