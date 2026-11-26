// Docs: Plugin guidelines > Vault > Use normalizePath() to clean up user-defined paths
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+%60normalizePath()%60+to+clean+up+user-defined+paths
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/da382ee87130bc0aba10f6309ebc0f67a4ed4da0/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L271
// The code block is licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.).
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';
import { normalizePath } from 'obsidian';

const pathToPlugin = normalizePath('//my-folder\file');
// pathToPlugin contains "my-folder/file" not "//my-folder\"

export { pathToPlugin };

export async function run(context: DocsContext): Promise<void> {
  context.report("Declares pathToPlugin. It compiles against the API, and there is nothing in it to run on its own.");
}
