// Docs: debounce > Example
// https://docs.obsidian.md/Reference/TypeScript+API/debounce#Example
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Reference/TypeScript%20API/debounce.md?plain=1#L37
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { debounce } from 'obsidian';

async function snippet(context: DocsContext) {
  {
    const debounced = debounce((text: string) => {
        console.log(text);
    }, 1000, true);
    debounced('Hello world'); // this will not be printed
    await sleep(500);
    debounced('World, hello'); // this will be printed to the console.
  }
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await snippet(context));
}
