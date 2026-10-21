// Docs: Modals > Select from list of suggestions > Approximate string matching results
// https://docs.obsidian.md/Plugins/User+interface/Modals#Approximate+string+matching+results
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L132
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import {FuzzySuggestModal, Notice} from "obsidian";
import { ALL_BOOKS, Book } from './05-select-from-list-of-suggestions.ts';

export class ExampleSuggestModal extends FuzzySuggestModal<Book> {
  getItems(): Book[] {
    return ALL_BOOKS;
  }

  getItemText(book: Book): string {
    return book.title;
  }

  onChooseItem(book: Book, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${book.title}`);
  }
}

export async function run(context: DocsContext): Promise<void> {
  context.openModal(new ExampleSuggestModal(context.app));
}
