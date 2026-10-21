// Docs: State fields > Dispatching state effects (2)
// https://docs.obsidian.md/Plugins/Editor/State+fields#Dispatching+state+effects
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20fields.md?plain=1#L73
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { addEffect, resetEffect, subtractEffect } from './01-defining-state-effects.ts';
import { EditorView } from '@codemirror/view';

export function add(view: EditorView, num: number) {
  view.dispatch({
    effects: [addEffect.of(num)],
  });
}

export function subtract(view: EditorView, num: number) {
  view.dispatch({
    effects: [subtractEffect.of(num)],
  });
}

export function reset(view: EditorView) {
  view.dispatch({
    effects: [resetEffect.of(null)],
  });
}

export async function run(context: DocsContext): Promise<void> {
  await context.showResult(await add(await context.getEditorView(), 1), 'add()');
  await context.showResult(await subtract(await context.getEditorView(), 1), 'subtract()');
  await context.showResult(await reset(await context.getEditorView()), 'reset()');
}
