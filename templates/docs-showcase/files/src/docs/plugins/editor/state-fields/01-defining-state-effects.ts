// Docs: State fields > Defining state effects
// https://docs.obsidian.md/Plugins/Editor/State+fields#Defining+state+effects
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20fields.md?plain=1#L20
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { StateEffect } from '@codemirror/state';

const addEffect = StateEffect.define<number>();
const subtractEffect = StateEffect.define<number>();
const resetEffect = StateEffect.define();

export { addEffect, subtractEffect, resetEffect };

export async function run(context: DocsContext): Promise<void> {
  context.report("Declares addEffect, subtractEffect, resetEffect. It compiles against the API, and there is nothing in it to run on its own.");
}
