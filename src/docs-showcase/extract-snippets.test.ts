import {
  describe,
  expect,
  it
} from 'vitest';

import { extractSnippets } from './extract-snippets.ts';

describe('extractSnippets', () => {
  const FIRST_FENCE_LINE = 8;
  const SECOND_FENCE_LINE = 14;

  it('reads each fenced block with its language, line and the headings above it', () => {
    const page = [
      '---',
      'aliases: Vault',
      '---',
      '# Vault',
      '',
      '## Read files',
      '',
      '```ts',
      'const files = this.app.vault.getMarkdownFiles();',
      '```',
      '',
      '### Cached',
      '',
      '```TypeScript title="main.ts"',
      'await vault.cachedRead(file);',
      '```'
    ].join('\n');

    expect(extractSnippets(new Map([['Plugins/Vault.md', page]]))).toEqual([
      {
        code: 'const files = this.app.vault.getMarkdownFiles();',
        headings: ['Vault', 'Read files'],
        lang: 'ts',
        line: FIRST_FENCE_LINE,
        page: 'Plugins/Vault',
        title: ''
      },
      {
        code: 'await vault.cachedRead(file);',
        headings: ['Vault', 'Read files', 'Cached'],
        lang: 'typescript',
        line: SECOND_FENCE_LINE,
        page: 'Plugins/Vault',
        title: 'main.ts'
      }
    ]);
  });

  it('skips the declaration API Documenter writes under a Signature paragraph', () => {
    const page = ['## Vault.read() method', '', '**Signature:**', '', '```typescript', 'read(file: TFile): Promise<string>;', '```'].join('\n');

    expect(extractSnippets(new Map([['Reference/TypeScript API/Vault/read.md', page]]))).toEqual([]);
  });

  it('removes the fence\'s own indentation, as inside a list item', () => {
    const page = ['1. Run:', '', '   ```bash', '   npm install', '     --save-dev', '   ```'].join('\n');

    expect(extractSnippets(new Map([['Plugins/Build.md', page]]))[0]?.code).toBe('npm install\n  --save-dev');
  });

  it('keeps a shorter fence inside a longer one as content', () => {
    const page = ['````md', '```mermaid', 'flowchart LR', '```', '````'].join('\n');

    expect(extractSnippets(new Map([['Plugins/Post.md', page]]))[0]?.code).toBe('```mermaid\nflowchart LR\n```');
  });

  it('orders pages by path and ignores files that are not Markdown', () => {
    // Given out of order on purpose: the extractor sorts them.
    const unsortedPages: [string, string][] = [
      ['b.md', '```ts\nb();\n```'],
      ['image.png', '```ts\nc();\n```'],
      ['a.md', '```ts\na();\n```']
    ];
    const snippets = extractSnippets(new Map(unsortedPages));

    expect(snippets.map((snippet) => snippet.page)).toEqual(['a', 'b']);
  });
});
