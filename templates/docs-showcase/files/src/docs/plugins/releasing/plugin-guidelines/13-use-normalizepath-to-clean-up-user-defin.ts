// Docs: Plugin guidelines > Vault > Use normalizePath() to clean up user-defined paths
// https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+%60normalizePath()%60+to+clean+up+user-defined+paths
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/c56c7e770ba25dd0ea392aacf4588f9425970d36/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L271
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
