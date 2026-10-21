// Docs: Icons > Add your own icon
// https://docs.obsidian.md/Plugins/User+interface/Icons#Add+your+own+icon
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Icons.md?plain=1#L36
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { addIcon, Plugin } from 'obsidian';

export default class ExamplePlugin extends Plugin {
  async onload() {
    addIcon('circle', `<circle cx="50" cy="50" r="50" fill="currentColor" />`);

    this.addRibbonIcon('circle', 'Click me', () => {
      console.log('Hello, you!');
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(ExamplePlugin);
}
