// Docs: Use React in your plugin > Configure your plugin (3)
// https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin#Configure+your+plugin
// Source: https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L25
// The code block is licensed under 0BSD (Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.), the license of obsidianmd/obsidian-developer-docs.
// The code block is upstream's, as the docs show it. create-obsidian-plugin generated the rest: the imports it
// leaves out, the exports later blocks on the page take, and the `run(context)` host the command calls.

import type { DocsContext } from '../../../host.ts';

async function snippet(context: DocsContext) {
  const value = (
    {
      "compilerOptions": {
        "jsx": "react-jsx"
      }
    }
  );
  await context.showResult(value);
}

export async function run(context: DocsContext): Promise<void> {
  await snippet(context);
}
