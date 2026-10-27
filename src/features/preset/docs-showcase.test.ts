import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import type { DocsShowcaseReport } from '../../docs-showcase/docs-showcase-files.ts';

import { makeAnswers } from '../../answers/answer-space.ts';
import { DOCS_SHOWCASE_REPORT_PATH } from '../../docs-showcase/docs-showcase-files.ts';
import { getPackageRoot } from '../../official-sample.ts';
import { copyTemplates } from '../../templates.ts';

interface PackageJson {
  scripts: Record<string, string>;
}

interface TsConfigJson {
  exclude?: string[];
}

describe('the docs-showcase preset', () => {
  let targetDir = '';
  const report = JSON.parse(readFileSync(join(getPackageRoot(), DOCS_SHOWCASE_REPORT_PATH), 'utf-8')) as DocsShowcaseReport;

  function read(path: string): string {
    return readFileSync(join(targetDir, path), 'utf-8');
  }

  beforeAll(() => {
    targetDir = mkdtempSync(join(tmpdir(), 'cop-docs-showcase-'));
    copyTemplates(
      makeAnswers({ formatter: 'dprint', linter: 'eslint', preset: 'docs-showcase', spellChecker: 'cspell', testRunner: 'vitest' }),
      targetDir,
      '1.0.0',
      null
    );
  });

  afterAll(() => {
    rmSync(targetDir, { force: true, recursive: true });
  });

  it('writes the module of every runnable block, and only those, with the host beside them', () => {
    const runnable = report.entries.filter((entry) => entry.status === 'runnable');
    expect(runnable.length).toBeGreaterThan(0);
    // A block that failed its type check keeps the module path it would have had, and that module is not written.
    for (const entry of report.entries.filter((candidate) => candidate.file !== '')) {
      expect(existsSync(join(targetDir, 'src', 'docs', entry.file)), entry.file).toBe(entry.status === 'runnable');
    }
    for (const file of ['entry.d.ts', 'entry.js', 'host.ts', 'index.ts', 'README.md', 'tsconfig.json']) {
      expect(existsSync(join(targetDir, 'src', 'docs', file)), file).toBe(true);
    }
    const index = read('src/docs/index.ts');
    for (const entry of runnable) {
      expect(index).toContain(`import("./${entry.file}")`);
    }
  });

  it('lists every block in the showcase README, so none is dropped silently', () => {
    const readme = read('src/docs/README.md');
    for (const entry of report.entries) {
      expect(readme).toContain(`?plain=1#L${String(entry.line)})`);
    }
  });

  it('registers the commands from the All-in-one Framework plugin', () => {
    const plugin = read('src/plugin.ts');
    expect(plugin).toContain('import { registerDocsShowcase } from \'./docs/entry.js\';');
    expect(plugin).toContain('registerDocsShowcase(this);');
    expect(plugin).toContain('OpenDemoVaultCommandHandler');
  });

  it('links the snippet\'s docs page from every Notice, modal and settings tab a command shows', () => {
    const host = read('src/docs/host.ts');
    // The one Notice is the one in `showDocsNotice`, which puts the link under every message.
    expect(host.match(/new Notice\(/g)).toHaveLength(1);
    expect(host).toMatch(/function showDocsNotice\(entry: DocsEntry, message: string\): void \{\n {2}new Notice\(createFragment\(\(fragment\) => \{\n(?:.*\n){2} {4}fragment\.append\(createDocsLink\(entry\)\);/);
    expect(host).toContain('href: entry.source,');
    expect(host).toContain('modal.titleEl.createDiv({ cls: \'setting-item-description\' }).append(createDocsLink(this.entry));');
    expect(host).toContain('child.addSettingTab(withDocsLink(createTab(this.app, child), this.entry));');
    for (const method of ['openModal', 'openView']) {
      expect(host).toMatch(new RegExp(`public (?:async )?${method}\\([^]*?showDocsNotice\\(this\\.entry, `));
    }
    expect(host).toContain('id: \'open-docs-page\',');
  });

  it('keeps the project\'s own tooling out of the showcase folder', () => {
    const tsconfig = JSON.parse(read('tsconfig.json')) as TsConfigJson;
    expect(tsconfig.exclude).toEqual(['./src/docs']);
    expect(read('scripts/eslint-config.ts')).toContain('\'src/docs/**\'');
    expect(read('dprint.json')).toContain('"src/docs"');
    expect(read('cspell.json')).toContain('"src/docs"');
    expect(read('scripts/vitest-config.ts')).toContain('context.coverageExclude.push(\'src/docs/**\');');
  });

  it('type-checks the showcase folder under its own tsconfig as part of build:compile', () => {
    const packageJson = JSON.parse(read('package.json')) as PackageJson;
    expect(packageJson.scripts['build:compile:typescript']).toBe('jiti scripts/build-compile-typescript.ts');
    expect(read('scripts/build-compile-typescript.ts')).toContain('\'src/docs/tsconfig.json\'');
  });

  it('runs every command in a real Obsidian through the desktop integration suite', () => {
    expect(read('src/docs-showcase.desktop.integration.test.ts')).toContain('const PLUGIN_ID = \'my-tool\';');
  });
});
