// Docs: Modals > Accept user input (2)
// https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L70
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext, DocsThis } from '../../../host.ts';
import { ExampleModal } from './03-accept-user-input.ts';
import { Notice } from 'obsidian';

async function snippet(this: DocsThis, context: DocsContext) {
  {
    new ExampleModal(this.app, (result) => {
      new Notice(`Hello, ${result}!`);
    }).open();
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet.call(context.thisValue(), context));
}
