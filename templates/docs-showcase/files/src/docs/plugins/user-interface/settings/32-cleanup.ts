// Docs: Settings > Render callback > Cleanup
// https://docs.obsidian.md/Plugins/User+interface/Settings#Cleanup
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L749
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { SettingDefinitionItem } from 'obsidian';

async function snippet(context: DocsContext) {
  const value: SettingDefinitionItem = (
    {
      name: 'Live preview',
      render: (setting) => {
        let previewEl = setting.controlEl.createDiv('preview');
        let observer = new ResizeObserver(() => {
          previewEl.setText(`${previewEl.clientWidth}px`);
        });
        observer.observe(previewEl);
        return () => observer.disconnect();
      },
    }
  );
  await context.showSettingDefinitions([value]);
}

export async function run(context: DocsContext): Promise<void> {
  await snippet(context);
}
