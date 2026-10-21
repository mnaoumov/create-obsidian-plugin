// Docs: Build a Bases view > Step 3: Add configuration
// https://docs.obsidian.md/Plugins/Guides/Build+a+Bases+view#Step+3%3A+Add+configuration
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Build%20a%20Bases%20view.md?plain=1#L91
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { ExampleViewType, MyBasesView } from './02-step-2-create-and-register-the-bases-vie.ts';
import { Plugin } from 'obsidian';

export default class MyPlugin extends Plugin {
  async onload() {
    // Tell Obsidian about the new view type that this plugin provides.
    this.registerBasesView(ExampleViewType, {
      name: "Example",
      icon: 'lucide-graduation-cap',
      factory: (controller, containerEl) => {
        return new MyBasesView(controller, containerEl)
      },
      options: () => ([
        {
          // The type of option. 'text' is a text input.
          type: 'text',
          // The name displayed in the settings menu.
          displayName: 'Property separator',
          // The value saved to the view settings.
          key: 'separator',
          // The default value for this option.
          default: ' - ',
        },
        // ...
    ]),
    });
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.toggleChildPlugin(MyPlugin);
}
