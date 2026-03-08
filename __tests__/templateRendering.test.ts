import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import type { Answers } from '../src/Answers.ts';

import { copyTemplates } from '../src/templates.ts';

const CURRENT_YEAR = 2026;

function makeAnswers(overrides: Partial<Answers> = {}): Answers {
  return {
    apiSubset: 'official',
    authorGitHubName: 'testuser',
    authorName: 'Test User',
    buildSystem: 'esbuild',
    currentYear: CURRENT_YEAR,
    e2eTestRunner: 'none',
    editorExtensions: 'none',
    formatter: 'none',
    fundingUrl: '',
    gitHubFunding: 'funding-yml',
    gitHubIssueTemplates: 'bug-and-feature',
    linter: 'none',
    markdownLinter: 'none',
    packageManager: 'npm',
    platformSupport: 'desktop-and-mobile',
    pluginDescription: 'A test plugin.',
    pluginId: 'my-plugin',
    pluginName: 'My Plugin',
    pluginShortName: 'MyPlugin',
    preset: 'standalone',
    spellChecker: 'none',
    styling: 'none',
    testRunner: 'none',
    uiFramework: 'none',
    wasmSupport: 'none',
    ...overrides
  };
}

describe('copyTemplates', () => {
  let targetDir: string;

  beforeEach(() => {
    targetDir = mkdtempSync(join(tmpdir(), 'obsidian-plugin-test-'));
  });

  afterEach(() => {
    rmSync(targetDir, { force: true, recursive: true });
  });

  it('creates package.json with correct metadata', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as Record<string, unknown>;
    expect(pkg['name']).toBe('my-plugin');
    expect(pkg['description']).toBe('A test plugin.');
  });

  it('creates manifest.json with correct fields', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['id']).toBe('my-plugin');
    expect(manifest['name']).toBe('My Plugin');
    expect(manifest['author']).toBe('testuser');
  });

  it('excludes fundingUrl from manifest when empty', () => {
    copyTemplates(makeAnswers({ fundingUrl: '' }), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest).not.toHaveProperty('fundingUrl');
  });

  it('includes fundingUrl in manifest when set', () => {
    copyTemplates(makeAnswers({ fundingUrl: 'https://example.com/sponsor' }), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['fundingUrl']).toBe('https://example.com/sponsor');
  });

  it('creates README with plugin name', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('# My Plugin');
  });

  it('includes Support section in README when fundingUrl is set', () => {
    copyTemplates(makeAnswers({ fundingUrl: 'https://example.com/sponsor' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('## Support');
    expect(readme).toContain('https://example.com/sponsor');
  });

  it('excludes Support section from README when fundingUrl is empty', () => {
    copyTemplates(makeAnswers({ fundingUrl: '' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).not.toContain('## Support');
  });

  it('creates tsconfig.json', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
  });

  it('renders EJS templates in package.json scripts', () => {
    copyTemplates(makeAnswers({ linter: 'eslint' }), targetDir, '1.0.0', null);
    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['lint']).toBe('jiti scripts/lint.ts');
    expect(pkg.scripts['lint:fix']).toBe('jiti scripts/lint-fix.ts');
  });

  it('creates eslint config when eslint is selected', () => {
    copyTemplates(makeAnswers({ linter: 'eslint' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'eslint.config.mts'))).toBe(true);
    expect(existsSync(join(targetDir, 'scripts/lint.ts'))).toBe(true);
    expect(existsSync(join(targetDir, 'scripts/lint-fix.ts'))).toBe(true);
  });

  it('does not create eslint config when eslint is not selected', () => {
    copyTemplates(makeAnswers({ linter: 'none' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'eslint.config.mts'))).toBe(false);
    expect(existsSync(join(targetDir, 'scripts/lint.ts'))).toBe(false);
  });

  it('creates biome config and lint scripts when biome is selected', () => {
    copyTemplates(makeAnswers({ linter: 'biome' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'biome.json'))).toBe(true);
    const lint = readFileSync(join(targetDir, 'scripts/lint.ts'), 'utf-8');
    expect(lint).toContain('biome lint');
    const lintFix = readFileSync(join(targetDir, 'scripts/lint-fix.ts'), 'utf-8');
    expect(lintFix).toContain('biome lint --write');
  });

  it('renders build script from esbuild partial', () => {
    copyTemplates(makeAnswers({ buildSystem: 'esbuild' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('esbuild');
    expect(buildScript).toContain('const prod = process.argv[2] !== \'dev\'');
  });

  it('renders build script from rollup partial', () => {
    copyTemplates(makeAnswers({ buildSystem: 'rollup' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('rollup');
  });

  it('renders build script from vite partial', () => {
    copyTemplates(makeAnswers({ buildSystem: 'vite' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('vite');
  });

  it('renders build script from webpack partial', () => {
    copyTemplates(makeAnswers({ buildSystem: 'webpack' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('webpack');
  });

  it('creates webpack config with render sections', () => {
    copyTemplates(makeAnswers({ buildSystem: 'webpack' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/webpack.config.ts'), 'utf-8');
    expect(config).toContain('ts-loader');
    expect(config).toContain('libraryTarget');
  });

  it('renders build script from parcel partial', () => {
    copyTemplates(makeAnswers({ buildSystem: 'parcel' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('parcel');
  });

  it('creates dev.ts script', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const devScript = readFileSync(join(targetDir, 'scripts/dev.ts'), 'utf-8');
    expect(devScript).toContain('process.argv[2] = \'dev\'');
    expect(devScript).toContain('import(\'./build.ts\')');
  });

  it('creates version.ts script', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'scripts/version.ts'))).toBe(true);
  });

  it('creates format scripts for prettier', () => {
    copyTemplates(makeAnswers({ formatter: 'prettier' }), targetDir, '1.0.0', null);
    const format = readFileSync(join(targetDir, 'scripts/format.ts'), 'utf-8');
    expect(format).toContain('prettier --write');
    const formatCheck = readFileSync(join(targetDir, 'scripts/format-check.ts'), 'utf-8');
    expect(formatCheck).toContain('prettier --check');
  });

  it('creates format scripts for dprint', () => {
    copyTemplates(makeAnswers({ formatter: 'dprint' }), targetDir, '1.0.0', null);
    const format = readFileSync(join(targetDir, 'scripts/format.ts'), 'utf-8');
    expect(format).toContain('dprint fmt');
    const formatCheck = readFileSync(join(targetDir, 'scripts/format-check.ts'), 'utf-8');
    expect(formatCheck).toContain('dprint check');
  });

  it('creates format scripts for biome', () => {
    copyTemplates(makeAnswers({ formatter: 'biome' }), targetDir, '1.0.0', null);
    const format = readFileSync(join(targetDir, 'scripts/format.ts'), 'utf-8');
    expect(format).toContain('biome format --write');
    const formatCheck = readFileSync(join(targetDir, 'scripts/format-check.ts'), 'utf-8');
    expect(formatCheck).toContain('biome format');
  });

  it('creates test scripts for vitest', () => {
    copyTemplates(makeAnswers({ testRunner: 'vitest' }), targetDir, '1.0.0', null);
    const test = readFileSync(join(targetDir, 'scripts/test.ts'), 'utf-8');
    expect(test).toContain('vitest run');
    const testWatch = readFileSync(join(targetDir, 'scripts/test-watch.ts'), 'utf-8');
    expect(testWatch).toContain('vitest');
  });

  it('creates test scripts for jest', () => {
    copyTemplates(makeAnswers({ testRunner: 'jest' }), targetDir, '1.0.0', null);
    const test = readFileSync(join(targetDir, 'scripts/test.ts'), 'utf-8');
    expect(test).toContain('jest');
    const testWatch = readFileSync(join(targetDir, 'scripts/test-watch.ts'), 'utf-8');
    expect(testWatch).toContain('jest --watch');
  });

  it('creates spellcheck script for cspell', () => {
    copyTemplates(makeAnswers({ spellChecker: 'cspell' }), targetDir, '1.0.0', null);
    const spellcheck = readFileSync(join(targetDir, 'scripts/spellcheck.ts'), 'utf-8');
    expect(spellcheck).toContain('cspell');
  });

  it('creates markdownlint scripts', () => {
    copyTemplates(makeAnswers({ markdownLinter: 'markdownlint' }), targetDir, '1.0.0', null);
    const lintMd = readFileSync(join(targetDir, 'scripts/lint-md.ts'), 'utf-8');
    expect(lintMd).toContain('markdownlint-cli2 .');
    expect(lintMd).not.toContain('--fix');
    const lintMdFix = readFileSync(join(targetDir, 'scripts/lint-md-fix.ts'), 'utf-8');
    expect(lintMdFix).toContain('markdownlint-cli2 --fix');
  });

  it('writes generator config file', () => {
    const config = copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    expect(config.generatorVersion).toBe('1.0.0');
    expect(Object.keys(config.fileHashes).length).toBeGreaterThan(0);
  });

  it('does not produce empty files', async () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const { readdirSync, statSync } = await import('node:fs') as typeof import('node:fs');

    function walk(dir: string): string[] {
      const results: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          results.push(...walk(full));
        } else {
          results.push(full);
        }
      }
      return results;
    }

    const files = walk(targetDir).filter((f) => !f.endsWith('.json'));
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content.trim(), `File "${file}" should not be empty`).not.toBe('');
    }
  });
});
