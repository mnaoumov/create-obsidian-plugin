import { describe, expect, it } from 'vitest';

import type { Answers } from '../src/Answers.ts';
import { buildTemplate } from '../src/templates.ts';

function makeAnswers(overrides: Partial<Answers> = {}): Answers {
  return {
    pluginId: 'test',
    pluginName: 'Test',
    pluginShortName: 'Test',
    pluginDescription: 'A test plugin.',
    authorGitHubName: 'user',
    authorName: 'User',
    currentYear: 2026,
    fundingUrl: '',
    preset: 'enhanced',
    buildSystem: 'esbuild',
    framework: 'none',
    formatter: 'prettier',
    testRunner: 'none',
    e2eTestRunner: 'none',
    wasmSupport: 'none',
    apiSubset: 'official',
    cssMode: 'none',
    editorExtensions: 'none',
    linter: 'eslint',
    markdownLinter: 'markdownlint',
    spellChecker: 'cspell',
    packageManager: 'npm',
    platformSupport: 'desktop-and-mobile',
    isDesktopOnly: false,
    hasCss: false,
    hasScss: false,
    hasEslint: true,
    hasPrettier: true,
    hasCspell: true,
    hasMarkdownLint: true,
    hasEditorExtensions: false,
    hasWasm: false,
    hasTests: false,
    hasE2eTests: false,
    shouldEnableUnofficialInternalObsidianApi: false,
    ...overrides,
  };
}

describe('buildTemplate', () => {
  describe('base configuration', () => {
    it('always includes base scripts', () => {
      const builder = buildTemplate(makeAnswers());
      const scripts = builder.scripts;
      expect(scripts['dev']).toBe('jiti scripts/dev.ts');
      expect(scripts['build']).toBe('jiti scripts/build.ts');
      expect(scripts['version']).toBe('jiti scripts/version.ts');
    });

    it('always includes base dependencies', () => {
      const builder = buildTemplate(makeAnswers());
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('typescript');
      expect(depNames).toContain('jiti');
      expect(depNames).toContain('obsidian');
      expect(depNames).toContain('tslib');
      expect(depNames).toContain('@types/node');
    });

    it('always includes base template files', () => {
      const builder = buildTemplate(makeAnswers());
      const files = [...builder.templateFiles];
      expect(files).toContain('package.json');
      expect(files).toContain('manifest.json');
      expect(files).toContain('README.md');
      expect(files).toContain('tsconfig.json');
      expect(files).toContain('scripts/build.ts');
      expect(files).toContain('scripts/dev.ts');
      expect(files).toContain('scripts/version.ts');
      expect(files).toContain('src/main.ts');
      expect(files).toContain('src/Plugin.ts');
    });

    it('includes common partial', () => {
      const builder = buildTemplate(makeAnswers());
      expect(builder.partials.has('common')).toBe(true);
    });
  });

  describe('no .ejs in registered files', () => {
    it('never registers files with .ejs extension', () => {
      const presets: Partial<Answers>[] = [
        { preset: 'standalone', linter: 'none', formatter: 'none', spellChecker: 'none', markdownLinter: 'none' },
        { preset: 'enhanced' },
        { preset: 'demo', framework: 'none', testRunner: 'vitest', linter: 'none', spellChecker: 'none', markdownLinter: 'none' },
        { buildSystem: 'vite', framework: 'svelte', testRunner: 'vitest', e2eTestRunner: 'playwright', editorExtensions: 'codemirror', cssMode: 'scss', apiSubset: 'with-unofficial' },
      ];

      for (const overrides of presets) {
        const builder = buildTemplate(makeAnswers(overrides));
        for (const file of builder.templateFiles) {
          expect(file, `File "${file}" should not end with .ejs`).not.toMatch(/\.ejs$/);
        }
      }
    });
  });

  describe('fundingUrl partial', () => {
    it('adds has-funding partial when fundingUrl is set', () => {
      const builder = buildTemplate(makeAnswers({ fundingUrl: 'https://example.com' }));
      expect(builder.partials.has('has-funding')).toBe(true);
    });

    it('does not add has-funding partial when fundingUrl is empty', () => {
      const builder = buildTemplate(makeAnswers({ fundingUrl: '' }));
      expect(builder.partials.has('has-funding')).toBe(false);
    });
  });

  describe('eslint feature', () => {
    it('adds eslint scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ linter: 'eslint' }));
      expect(builder.scripts['lint']).toBe('jiti scripts/lint.ts');
      expect(builder.scripts['lint:fix']).toBe('jiti scripts/lint-fix.ts');
      expect([...builder.templateFiles]).toContain('eslint.config.mts');
      expect([...builder.templateFiles]).toContain('scripts/lint.ts');
      expect([...builder.templateFiles]).toContain('scripts/lint-fix.ts');
    });

    it('adds eslint dependencies', () => {
      const builder = buildTemplate(makeAnswers({ linter: 'eslint' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('@eslint/js');
      expect(depNames).toContain('typescript-eslint');
    });

    it('does not add lint scripts when linter is none', () => {
      const builder = buildTemplate(makeAnswers({ linter: 'none' }));
      expect(builder.scripts['lint']).toBeUndefined();
      expect(builder.scripts['lint:fix']).toBeUndefined();
    });
  });

  describe('formatter feature', () => {
    it('adds prettier scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ formatter: 'prettier' }));
      expect(builder.scripts['format']).toBe('jiti scripts/format.ts');
      expect(builder.scripts['format:check']).toBe('jiti scripts/format-check.ts');
      expect([...builder.templateFiles]).toContain('scripts/format.ts');
      expect([...builder.templateFiles]).toContain('scripts/format-check.ts');
    });

    it('adds dprint scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ formatter: 'dprint' }));
      expect(builder.scripts['format']).toBe('jiti scripts/format.ts');
      expect(builder.scripts['format:check']).toBe('jiti scripts/format-check.ts');
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('dprint');
      expect(depNames).not.toContain('prettier');
    });
  });

  describe('test runner feature', () => {
    it('adds vitest scripts including test:watch', () => {
      const builder = buildTemplate(makeAnswers({ testRunner: 'vitest' }));
      expect(builder.scripts['test']).toBe('jiti scripts/test.ts');
      expect(builder.scripts['test:watch']).toBe('jiti scripts/test-watch.ts');
      expect([...builder.templateFiles]).toContain('scripts/test-watch.ts');
    });

    it('adds jest scripts without test:watch', () => {
      const builder = buildTemplate(makeAnswers({ testRunner: 'jest' }));
      expect(builder.scripts['test']).toBe('jiti scripts/test.ts');
      expect(builder.scripts['test:watch']).toBeUndefined();
    });

    it('does not add test scripts when none', () => {
      const builder = buildTemplate(makeAnswers({ testRunner: 'none' }));
      expect(builder.scripts['test']).toBeUndefined();
    });
  });

  describe('e2e test runner feature', () => {
    it('adds test:e2e script for playwright', () => {
      const builder = buildTemplate(makeAnswers({ e2eTestRunner: 'playwright' }));
      expect(builder.scripts['test:e2e']).toBe('jiti scripts/test-e2e.ts');
      expect([...builder.templateFiles]).toContain('playwright.config.ts');
    });

    it('adds test:e2e script for wdio-obsidian', () => {
      const builder = buildTemplate(makeAnswers({ e2eTestRunner: 'wdio-obsidian' }));
      expect(builder.scripts['test:e2e']).toBe('jiti scripts/test-e2e.ts');
      expect([...builder.templateFiles]).toContain('wdio.conf.ts');
    });

    it('adds test:e2e script for obsidian-test', () => {
      const builder = buildTemplate(makeAnswers({ e2eTestRunner: 'obsidian-test' }));
      expect(builder.scripts['test:e2e']).toBe('jiti scripts/test-e2e.ts');
    });
  });

  describe('build system feature', () => {
    it('adds esbuild dependency for esbuild', () => {
      const builder = buildTemplate(makeAnswers({ buildSystem: 'esbuild' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('esbuild');
    });

    it('adds rollup files and dependencies', () => {
      const builder = buildTemplate(makeAnswers({ buildSystem: 'rollup' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('rollup');
      expect([...builder.templateFiles]).toContain('rollup.config.mjs');
      expect([...builder.templateFiles]).toContain('scripts/rollup.config.ts');
    });

    it('adds vite files and dependencies', () => {
      const builder = buildTemplate(makeAnswers({ buildSystem: 'vite' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('vite');
      expect([...builder.templateFiles]).toContain('vite.config.ts');
    });
  });

  describe('framework feature', () => {
    it('adds svelte packages and build plugin', () => {
      const builder = buildTemplate(makeAnswers({ framework: 'svelte', buildSystem: 'esbuild' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('svelte');
      expect(depNames).toContain('svelte-check');
      expect(depNames).toContain('esbuild-svelte');
    });

    it('adds react packages and build plugin for vite', () => {
      const builder = buildTemplate(makeAnswers({ framework: 'react', buildSystem: 'vite' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('react');
      expect(depNames).toContain('react-dom');
      expect(depNames).toContain('@vitejs/plugin-react');
    });
  });

  describe('preset feature', () => {
    it('standalone does not include obsidian-dev-utils', () => {
      const builder = buildTemplate(makeAnswers({ preset: 'standalone' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).not.toContain('obsidian-dev-utils');
    });

    it('enhanced includes obsidian-dev-utils', () => {
      const builder = buildTemplate(makeAnswers({ preset: 'enhanced' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('obsidian-dev-utils');
    });

    it('enhanced adds non-standalone partial', () => {
      const builder = buildTemplate(makeAnswers({ preset: 'enhanced' }));
      expect(builder.partials.has('non-standalone')).toBe(true);
    });
  });

  describe('markdownLinter feature', () => {
    it('adds markdownlint scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ markdownLinter: 'markdownlint' }));
      expect(builder.scripts['lint:md']).toBe('jiti scripts/lint-md.ts');
      expect(builder.scripts['lint:md:fix']).toBe('jiti scripts/lint-md-fix.ts');
      expect([...builder.templateFiles]).toContain('.markdownlint-cli2.mts');
      expect([...builder.templateFiles]).toContain('scripts/lint-md.ts');
      expect([...builder.templateFiles]).toContain('scripts/lint-md-fix.ts');
    });
  });

  describe('spellChecker feature', () => {
    it('adds cspell script and files', () => {
      const builder = buildTemplate(makeAnswers({ spellChecker: 'cspell' }));
      expect(builder.scripts['spellcheck']).toBe('jiti scripts/spellcheck.ts');
      expect([...builder.templateFiles]).toContain('cspell.json');
      expect([...builder.templateFiles]).toContain('scripts/spellcheck.ts');
    });
  });

  describe('demo preset', () => {
    it('activates override features even when not selected', () => {
      const builder = buildTemplate(makeAnswers({
        preset: 'demo',
        framework: 'none',
        linter: 'none',
        spellChecker: 'none',
        markdownLinter: 'none',
        testRunner: 'vitest',
      }));
      // Demo should activate react, svelte, eslint, markdownlint, cspell, scss, codemirror
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('react');
      expect(depNames).toContain('svelte');
      expect(depNames).toContain('@eslint/js');
      expect(depNames).toContain('cspell');

      expect(builder.partials.has('react')).toBe(true);
      expect(builder.partials.has('svelte')).toBe(true);
      expect(builder.partials.has('eslint')).toBe(true);
      expect(builder.partials.has('cspell')).toBe(true);
      expect(builder.partials.has('scss')).toBe(true);
      expect(builder.partials.has('codemirror')).toBe(true);
    });
  });

  describe('all scripts use default convention', () => {
    it('every script follows jiti scripts/{name}.ts pattern', () => {
      const configs: Partial<Answers>[] = [
        {},
        { testRunner: 'vitest', e2eTestRunner: 'playwright' },
        { preset: 'standalone', formatter: 'dprint', testRunner: 'jest' },
      ];

      for (const overrides of configs) {
        const builder = buildTemplate(makeAnswers(overrides));
        for (const [name, command] of Object.entries(builder.scripts)) {
          const expectedScriptName = name.replaceAll(':', '-');
          expect(command, `Script "${name}" should follow convention`).toBe(`jiti scripts/${expectedScriptName}.ts`);
        }
      }
    });
  });
});
