import {
  readdirSync,
  readFileSync
} from 'node:fs';
import {
  join,
  relative
} from 'node:path';
import {
  describe,
  expect,
  it
} from 'vitest';

import { findBareToolNames } from './bare-tool-names.ts';

const ROOT = join(import.meta.dirname, '..');

function listMarkdown(dir: string, isMarkdown: (name: string) => boolean): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && isMarkdown(entry.name))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)));
}

describe('findBareToolNames', () => {
  it('finds a tool named in prose without backticks', () => {
    expect(findBareToolNames('pnpm, yarn and bun work too.').map((found) => found.name)).toStrictEqual(['pnpm', 'yarn', 'bun']);
    expect(findBareToolNames('Then run npm install.').map((found) => found.line)).toStrictEqual([1]);
  });

  it('leaves code, links, headings, front matter and longer names alone', () => {
    const markdown = [
      '---',
      'description: npm needs a separator.',
      '---',
      '## Using npm',
      '`pnpm`, `yarn` and `bun` work too.',
      '[npm docs](https://docs.npmjs.com/) and <https://git-scm.com/>',
      '```bash',
      'npm create @mnaoumov/obsidian-plugin',
      '```',
      'Node.js ships npm.ps1, @mnaoumov/obsidian-lib and git-annex; nodes are not node.js.',
      'A span that wraps, `npm run',
      'build`, is code too.'
    ].join('\n');
    expect(findBareToolNames(markdown)).toStrictEqual([]);
  });
});

it('marks every tool name as code in the repository\'s own Markdown', () => {
  const files = [
    'README.md',
    'CONTRIBUTING.md',
    'AGENTS.md',
    ...listMarkdown(join('docs', 'src'), (name) => /\.mdx?$/.test(name)),
    ...listMarkdown(join('templates', 'default'), (name) => /^README\.md.*\.ejs$/.test(name))
  ];
  const offenders = files.flatMap((file) => findBareToolNames(readFileSync(join(ROOT, file), 'utf-8')).map((found) => `${file}:${String(found.line)}: ${found.name} in "${found.text}"`));
  expect(offenders).toStrictEqual([]);
});
