// Docs: Modals > Select from list of suggestions > Custom rendering of fuzzy search results
// https://docs.obsidian.md/Plugins/User+interface/Modals#Custom+rendering+of+fuzzy+search+results
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L158
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import {FuzzyMatch, FuzzySuggestModal, Notice, renderResults} from "obsidian";
import { ALL_BOOKS, Book } from './05-select-from-list-of-suggestions.ts';

export class ExampleSuggestModal extends FuzzySuggestModal<Book> {

    //return a string representation, so there is something to search
    getItemText(item: Book): string {
       return item.title + " " + item.author;
    }

    getItems(): Book[] {
       return ALL_BOOKS;
    }

    renderSuggestion(match: FuzzyMatch<Book>, el: HTMLElement) {
       const titleEl = el.createDiv();
       renderResults(titleEl, match.item.title, match.match);

       // Only render the matches in the author name.
       const authorEl = el.createEl('small');
       const offset = -(match.item.title.length + 1);
       renderResults(authorEl, match.item.author, match.match, offset);
    }

    onChooseItem(book: Book, evt: MouseEvent | KeyboardEvent): void {
       new Notice(`Selected ${book.title}`);
    }

}

export async function run(context: DocsContext): Promise<void> {
  context.openModal(new ExampleSuggestModal(context.app));
}
