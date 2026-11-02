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
import { TOOL_NAMES } from './tool-names.ts';

const ROOT = join(import.meta.dirname, '..');

function listFiles(dir: string, isProse: (path: string) => boolean): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .filter(isProse);
}

function namesIn(markdown: string): string[] {
  return findBareToolNames(markdown).map((found) => found.name);
}

describe('findBareToolNames', () => {
  it('finds a tool named in prose without backticks', () => {
    expect(namesIn('pnpm, yarn and bun work too.')).toStrictEqual(['pnpm', 'yarn', 'bun']);
    expect(findBareToolNames('Then run npm install.').map((found) => found.line)).toStrictEqual([1]);
  });

  it('finds libraries, frameworks, services and shells', () => {
    expect(namesIn('Build with esbuild, Vite, Rollup, Webpack or Parcel.')).toStrictEqual(['esbuild', 'Vite', 'Rollup', 'Webpack', 'Parcel']);
    expect(namesIn('Pick React, Preact, Vue, Svelte, Solid or Lit.')).toStrictEqual(['React', 'Preact', 'Vue', 'Svelte', 'Solid', 'Lit']);
    expect(namesIn('Test with Vitest or Jest, lint with ESLint, format with Prettier or dprint.')).toStrictEqual(['Vitest', 'Jest', 'ESLint', 'Prettier', 'dprint']);
    expect(namesIn('Style with PostCSS, SCSS, Tailwind CSS or CSS Modules, templated by EJS.')).toStrictEqual(['PostCSS', 'SCSS', 'Tailwind CSS', 'CSS Modules', 'EJS']);
    expect(namesIn('Post it on Discord or Telegram, and run it in PowerShell, cmd or bash.')).toStrictEqual(['Discord', 'Telegram', 'PowerShell', 'cmd', 'bash']);
  });

  it('marks a multi-word service as one span, and GitHub alone as a whole word', () => {
    expect(namesIn('GitHub Actions deploys GitHub Pages; your GitHub username.')).toStrictEqual(['GitHub Actions', 'GitHub Pages', 'GitHub']);
    expect(namesIn('See https://github.com/mnaoumov, @GitHub and GitHubs.')).toStrictEqual([]);
  });

  it('leaves the ordinary-word spellings of a name alone', () => {
    const markdown = [
      'A solid default, lit by a parcel of changes in one rollup.',
      'Do not jest; a sass reply would react badly, and prettier output is not the point.',
      'Lightning struck the tailwind of a husky dog.'
    ].join('\n');
    expect(namesIn(markdown)).toStrictEqual(['husky']);
  });

  it('leaves code, links, headings, quotes, EJS, front matter and longer names alone', () => {
    const markdown = [
      '---',
      'description: npm needs a separator.',
      '---',
      '## Using npm with Vite',
      '`pnpm`, `yarn` and `bun` work too.',
      '[npm docs](https://docs.npmjs.com/) and <https://git-scm.com/>',
      '```bash',
      'npm create @mnaoumov/obsidian-plugin',
      '```',
      'Node.js ships npm.ps1, @mnaoumov/obsidian-lib and git-annex; nodes are not node.js.',
      'vite.config.ts, @rollup/plugin-babel, eslint-plugin-obsidianmd and create-vue are other names.',
      'See "On the framework presets every bundler is an obsidian-dev-toolkit adapter".',
      'Rendered by <%= answers.bundler === \'vite\' ? \'Vite\' : \'esbuild\' %> at build time.',
      'A span that wraps, `npm run',
      'build`, is code too.'
    ].join('\n');
    expect(findBareToolNames(markdown)).toStrictEqual([]);
  });

  it('keeps every spelling unique', () => {
    expect(new Set(TOOL_NAMES).size).toBe(TOOL_NAMES.length);
  });
});

it('marks every tool name as code in the repository\'s own Markdown and in every template the generator emits', () => {
  const files = [
    'README.md',
    'CONTRIBUTING.md',
    'AGENTS.md',
    'CHANGELOG.md',
    'templates/docs-showcase/files/src/docs/README.md',
    ...listFiles(join('docs', 'src'), (path) => /\.mdx?$/.test(path)),
    ...listFiles(join('templates', 'default'), (path) => /\.md(?:@[^/]*)?\.ejs$/.test(path) || /\/ISSUE_TEMPLATE\/[^/]+\.yml\.ejs$/.test(path))
  ];
  const offenders = files.flatMap((file) => findBareToolNames(readFileSync(join(ROOT, file), 'utf-8')).map((found) => `${file}:${String(found.line)}: ${found.name} in "${found.text}"`));
  expect(offenders).toStrictEqual([]);
});
