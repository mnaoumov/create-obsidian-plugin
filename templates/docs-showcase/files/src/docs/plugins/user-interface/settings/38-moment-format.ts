// Docs: Settings > Legacy: imperative display() approach > Available components > Moment format
// https://docs.obsidian.md/Plugins/User+interface/Settings#Moment+format
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L925
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';
import { Setting } from 'obsidian';

async function snippet(this: DocsThis, context: DocsContext) {
  const containerEl = context.getContainerEl();
  {
    let dateSampleEl: HTMLElement;
    const dateDesc = createFragment((frag) => {
      frag.appendText('For a list of all available tokens, see the ');
      frag.createEl('a', {
        text: 'format reference',
        attr: { href: 'https://momentjs.com/docs/#/displaying/format/', target: '_blank' },
      });
      frag.createEl('br');
      frag.appendText('Your current syntax looks like this: ');
      dateSampleEl = frag.createEl('b', 'u-pop');
    });

    new Setting(containerEl)
      .setName('Date format')
      .setDesc(dateDesc)
      .addMomentFormat((momentFormat) => momentFormat
        .setValue(this.plugin.settings.dateFormat)
        .setSampleEl(dateSampleEl)
        .setDefaultFormat('MMMM dd, yyyy')
        .onChange(async (value) => {
          this.plugin.settings.dateFormat = value;
          await this.plugin.saveSettings();
        }));
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
