import type { LintError } from 'markdownlint';

import {
  TOOL_NAME_AS_CODE_RULE_NAME,
  toolNameAsCodeRule
} from '@mnaoumov/obsidian-dev-toolkit/linters/markdownlint-rules/tool-name-as-code';
import { TOOL_NAMES } from '@mnaoumov/obsidian-dev-toolkit/linters/tool-names';
import { lint } from 'markdownlint/sync';
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
import {
  parseDocument,
  visit
} from 'yaml';

const ROOT = join(import.meta.dirname, '..');

/** Decode issue-form prose before linting: YAML quotes and block indentation are not Markdown code. */
function issueFormStrings(source: string): string[] {
  const document = parseDocument(source);
  expect(document.errors).toStrictEqual([]);
  const strings: string[] = [];
  visit(document, {
    Scalar(_key, scalar) {
      if (typeof scalar.value === 'string') {
        strings.push(scalar.value);
      }
    }
  });
  return strings;
}

function lintToolNames(markdown: string): LintError[] {
  return lint({
    config: { default: false, [TOOL_NAME_AS_CODE_RULE_NAME]: true },
    customRules: [toolNameAsCodeRule],
    strings: { content: markdown }
  })['content'] ?? [];
}

function listFiles(dir: string, isProse: (path: string) => boolean): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .filter(isProse);
}

function namesIn(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  return lintToolNames(markdown).map((error) => {
    const [column = 1, length = 0] = error.errorRange ?? [];
    return lines[error.lineNumber - 1]?.slice(column - 1, column - 1 + length) ?? '';
  });
}

describe('shared tool-name-as-code rule', () => {
  it('finds a tool named in prose without backticks', () => {
    expect(namesIn('pnpm, yarn and bun work too.')).toStrictEqual(['pnpm', 'yarn', 'bun']);
    expect(lintToolNames('Then run npm install.').map((found) => found.lineNumber)).toStrictEqual([1]);
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
    expect(lintToolNames(markdown)).toStrictEqual([]);
  });

  it('checks quoted and block issue-form prose while preserving Markdown and EJS syntax', () => {
    const strings = issueFormStrings('description: "Use npm"\nbody:\n  - type: markdown\n    attributes:\n      value: |\n        Install with Vite.\n        Keep `npm` and <%= authorGitHubName %>.\n');
    expect(strings.flatMap(namesIn)).toStrictEqual(['npm', 'Vite']);
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
    ...listFiles(join('.github', 'ISSUE_TEMPLATE'), (path) => /\.ya?ml$/.test(path)),
    ...listFiles(join('docs', 'src'), (path) => /\.mdx?$/.test(path)),
    ...listFiles(join('templates', 'default'), (path) => /\.md(?:@[^/]*)?\.ejs$/.test(path) || /\/ISSUE_TEMPLATE\/[^/]+\.yml\.ejs$/.test(path))
  ];
  const offenders = files.flatMap((file) => {
    const source = readFileSync(join(ROOT, file), 'utf-8');
    const documents = /\.ya?ml(?:\.ejs)?$/.test(file) ? issueFormStrings(source) : [source];
    return documents.flatMap((markdown, index) => lintToolNames(markdown).map((error) => `${file} (prose ${String(index + 1)}):${String(error.lineNumber)}: ${String(error.errorDetail)}`));
  });
  expect(offenders).toStrictEqual([]);
});
