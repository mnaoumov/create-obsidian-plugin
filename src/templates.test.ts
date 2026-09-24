import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
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

import type { Answers } from './answers.ts';

import {
  ANSWER_SPACE,
  makeAnswers as makeSpaceAnswers
} from './answer-space.ts';
import {
  buildTemplate,
  copyTemplates,
  getScriptDir,
  isPartialTemplatePath,
  loadConfig,
  sortImportStatements
} from './templates.ts';

describe('buildTemplate', () => {
  const CURRENT_YEAR = 2026;

  function makeAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
      apiSubset: 'official',
      authorGitHubName: 'user',
      authorName: 'User',
      bundler: 'esbuild',
      commitLinting: 'conventional-commits',
      coverageBadge: 'none',
      currentYear: CURRENT_YEAR,
      defaultBranch: 'main',
      e2eTestRunner: 'none',
      editorExtensions: 'none',
      formatter: 'prettier',
      fundingPlatform: 'custom',
      fundingUrl: '',
      fundingUsername: 'user',
      gitHubActions: 'ci-and-release',
      gitHubIssueTemplates: 'bug-and-feature',
      hotReload: 'obsidian-cli',
      internationalization: 'none',
      linter: 'eslint',
      markdownLinter: 'markdownlint',
      obsidianConfigFolder: '',
      packageManager: 'npm',
      platformSupport: 'desktop-and-mobile',
      pluginDescription: 'A test plugin.',
      pluginId: 'test',
      pluginName: 'Test',
      preset: 'enhanced',
      spellChecker: 'cspell',
      styling: 'none',
      testRunner: 'none',
      uiFramework: 'none',
      wasmSupport: 'none',
      ...overrides
    };
  }

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
      expect(files).toContain('src/plugin.ts');
    });

    it('includes common partial', () => {
      const builder = buildTemplate(makeAnswers());
      expect(builder.partials.has('common')).toBe(true);
    });
  });

  describe('no .ejs in registered files', () => {
    it('never registers files with .ejs extension', () => {
      const presets: Partial<Answers>[] = [
        { formatter: 'none', linter: 'none', markdownLinter: 'none', preset: 'standalone', spellChecker: 'none' },
        { preset: 'enhanced' },
        { linter: 'none', markdownLinter: 'none', preset: 'demo', spellChecker: 'none', testRunner: 'vitest', uiFramework: 'none' },
        {
          apiSubset: 'with-unofficial',
          bundler: 'vite',
          e2eTestRunner: 'wdio-obsidian',
          editorExtensions: 'codemirror',
          styling: 'scss',
          testRunner: 'vitest',
          uiFramework: 'svelte'
        },
        {
          bundler: 'webpack',
          styling: 'scss',
          uiFramework: 'vue'
        }
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
      const builder = buildTemplate(makeAnswers({ linter: 'eslint', preset: 'standalone' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('eslint');
      expect(depNames).toContain('@eslint/js');
      expect(depNames).toContain('typescript-eslint');
    });

    // The obsidian-dev-utils presets get the shared config, which brings its own plugins, so the three
    // Packages only the inlined config imported would be declared and imported by nothing. `eslint` stays
    // Because the binary runs, and `typescript-eslint` because the `typescript` pin's `check` command
    // Reads its `package.json` for the peer range -- `checkRequires` silently downgrades that pin to a
    // Manual one the moment the package leaves the project.
    it('declares only the eslint packages a dev-utils preset actually uses', () => {
      const builder = buildTemplate(makeAnswers({ linter: 'eslint', preset: 'enhanced' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('eslint');
      expect(depNames).toContain('typescript-eslint');
      expect(depNames).not.toContain('@eslint/js');
      expect(depNames).not.toContain('globals');
      expect(depNames).not.toContain('eslint-plugin-obsidianmd');
    });

    it('emits the shared-config wrapper on a dev-utils preset and not on standalone', () => {
      expect([...buildTemplate(makeAnswers({ linter: 'eslint', preset: 'enhanced' })).templateFiles]).toContain('scripts/eslint-config.ts');
      expect([...buildTemplate(makeAnswers({ linter: 'eslint', preset: 'demo' })).templateFiles]).toContain('scripts/eslint-config.ts');
      expect([...buildTemplate(makeAnswers({ linter: 'eslint', preset: 'standalone' })).templateFiles]).not.toContain('scripts/eslint-config.ts');
    });

    it('adds biome scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ linter: 'biome' }));
      expect(builder.scripts['lint']).toBe('jiti scripts/lint.ts');
      expect(builder.scripts['lint:fix']).toBe('jiti scripts/lint-fix.ts');
      expect([...builder.templateFiles]).toContain('biome.jsonc');
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('@biomejs/biome');
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

    it('adds biome formatter scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ formatter: 'biome' }));
      expect(builder.scripts['format']).toBe('jiti scripts/format.ts');
      expect(builder.scripts['format:check']).toBe('jiti scripts/format-check.ts');
      expect([...builder.templateFiles]).toContain('biome.jsonc');
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('@biomejs/biome');
    });
  });

  describe('test runner feature', () => {
    it('adds vitest scripts including test:watch', () => {
      const builder = buildTemplate(makeAnswers({ testRunner: 'vitest' }));
      expect(builder.scripts['test']).toBe('jiti scripts/test.ts');
      expect(builder.scripts['test:watch']).toBe('jiti scripts/test-watch.ts');
      expect([...builder.templateFiles]).toContain('scripts/test-watch.ts');
    });

    it('adds jest scripts with test:watch', () => {
      const builder = buildTemplate(makeAnswers({ testRunner: 'jest' }));
      expect(builder.scripts['test']).toBe('jiti scripts/test.ts');
      expect(builder.scripts['test:watch']).toBe('jiti scripts/test-watch.ts');
    });

    it('does not add test scripts when none', () => {
      const builder = buildTemplate(makeAnswers({ testRunner: 'none' }));
      expect(builder.scripts['test']).toBeUndefined();
    });

    // The runtime `obsidian` module. Standalone gets it too: its premise is "no obsidian-dev-utils", and
    // `obsidian-test-mocks` pulls none of that in -- without it a standalone project can never unit-test
    // Code that imports `obsidian`. It is tied to the runner rather than to the preset, so a project that
    // Picked no runner carries no testing dependency at all.
    it('adds the obsidian mocks for every preset that picks a runner, and never without one', () => {
      for (const preset of ['standalone', 'enhanced', 'demo']) {
        for (const testRunner of ['jest', 'vitest']) {
          const builder = buildTemplate(makeAnswers({ preset, testRunner }));
          const depNames = builder.dependencies.map((d) => d.packageName);
          expect(depNames, `${preset} + ${testRunner}`).toContain('obsidian-test-mocks');
        }

        const withoutRunner = buildTemplate(makeAnswers({ preset, testRunner: 'none' }));
        expect(withoutRunner.dependencies.map((d) => d.packageName), preset).not.toContain('obsidian-test-mocks');
      }
    });
  });

  describe('e2e test runner feature', () => {
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

  describe('bundler feature', () => {
    it('adds esbuild dependency for esbuild', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'esbuild' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('esbuild');
    });

    it('adds rollup files and dependencies', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'rollup' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('rollup');
      expect([...builder.templateFiles]).toContain('rollup.config.mjs');
      expect([...builder.templateFiles]).toContain('scripts/rollup.config.ts');
    });

    it('adds vite files and dependencies', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'vite' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('vite');
      expect([...builder.templateFiles]).toContain('vite.config.ts');
    });

    it('adds webpack files and dependencies', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'webpack' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('webpack');
      expect(depNames).toContain('webpack-cli');
      expect(depNames).toContain('ts-loader');
      expect([...builder.templateFiles]).toContain('webpack.config.ts');
      expect([...builder.templateFiles]).toContain('scripts/webpack.config.ts');
    });

    it('adds parcel files and dependencies', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'parcel' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('parcel');
      expect(depNames).toContain('@parcel/config-default');
      expect([...builder.templateFiles]).toContain('.parcelrc');
    });
  });

  // Two of these named packages that have never existed on npm, so the answer could not `npm install`
  // At all -- and `resolveVersions` falls back to the literal `latest` when a lookup fails (so offline
  // Generation works), which is what let a name resolving to nothing look ordinary in `package.json`.
  // `npm run verify:answer-space -- --check-registry` is the sweep that catches the next one.
  describe('bundler plugin packages', () => {
    it('adds no esbuild plugin for preact, which esbuild handles through its own jsx options', () => {
      const packages = buildTemplate(makeAnswers({ bundler: 'esbuild', uiFramework: 'preact' })).dependencies.map((d) => d.packageName);
      expect(packages).not.toContain('esbuild-plugin-preact');
      expect(packages).toContain('preact');
    });

    // Parcel + Svelte has no usable package at all. The scoped `@parcel/transformer-svelte` has never
    // Existed, and the community `parcel-transformer-svelte` is Svelte 3-era: it peers on `svelte@^3`
    // And calls `svelte/compiler.js`, which Svelte 5 does not ship, so registering it only moved the
    // Failure from "No transformers found" to "Could not resolve module". The project ships its own.
    it('ships its own parcel svelte transformer, because no working package exists', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'parcel', uiFramework: 'svelte' }));
      const packages = builder.dependencies.map((d) => d.packageName);
      expect(packages).not.toContain('parcel-transformer-svelte');
      expect(packages).not.toContain('@parcel/transformer-svelte');
      expect([...builder.templateFiles]).toContain('parcel-transformer-svelte.cjs');
    });

    it('registers that transformer in .parcelrc, which declares none by default', () => {
      const targetDir = mkdtempSync(join(tmpdir(), 'cop-parcelrc-'));
      try {
        copyTemplates(makeAnswers({ bundler: 'parcel', uiFramework: 'svelte' }), targetDir, '1.0.0', null);
        const parcelrc = readFileSync(join(targetDir, '.parcelrc'), 'utf-8');
        expect(parcelrc).toContain('./parcel-transformer-svelte.cjs');
      } finally {
        rmSync(targetDir, { force: true, recursive: true });
      }
    });

    // `rollup-plugin-vue` passes `<script lang="ts">` on as a virtual module and compiles none of it, and
    // `@rollup/plugin-typescript` never sees a module outside the tsconfig program -- so every rollup + vue
    // Build died parsing the TypeScript, or, on `demo`, handed it to the react babel pass instead. Every
    // Preset, because `demo` reaches vue through its override rather than through the answer.
    it('strips the types from vue script blocks on rollup with a babel TypeScript pass', () => {
      for (const preset of ['standalone', 'enhanced', 'demo'] as const) {
        const answers = makeAnswers({ bundler: 'rollup', preset, uiFramework: preset === 'demo' ? 'none' : 'vue' });
        const packages = buildTemplate(answers).dependencies.map((d) => d.packageName);
        expect(packages, preset).toContain('@babel/preset-typescript');
        expect(packages, preset).toContain('@rollup/plugin-babel');

        const targetDir = mkdtempSync(join(tmpdir(), 'cop-rollup-vue-'));
        try {
          copyTemplates(answers, targetDir, '1.0.0', null);
          const config = readFileSync(join(targetDir, 'scripts/rollup.config.ts'), 'utf-8');
          const vueIndex = config.indexOf('vue(),');
          const tsPassIndex = config.indexOf('presets: [\'@babel/preset-typescript\']');
          expect(vueIndex, preset).toBeGreaterThan(-1);
          expect(tsPassIndex, preset).toBeGreaterThan(vueIndex);
          expect(config.indexOf('typescript({'), preset).toBeGreaterThan(tsPassIndex);
        } finally {
          rmSync(targetDir, { force: true, recursive: true });
        }
      }
    });

    // Its lists are composed from per-framework partials, each ending its item in a comma, and the keys
    // Were once in the reverse of `perfectionist/sort-objects` order: three lint errors on every
    // Dev-utils preset that reached it.
    it('emits a babel config with sorted keys and no trailing commas', () => {
      const cases = [
        { expected: 'export const config = {\n  plugins: [],\n  presets: [\n    \'@babel/preset-react\'\n  ]\n};\n', uiFramework: 'react' },
        {
          expected: 'export const config = {\n  plugins: [\n    [\'@babel/plugin-transform-react-jsx\', { importSource: \'preact\', runtime: \'automatic\' }]\n  ],\n  presets: []\n};\n',
          uiFramework: 'preact'
        }
      ] as const;
      for (const { expected, uiFramework } of cases) {
        const targetDir = mkdtempSync(join(tmpdir(), 'cop-rollup-babel-'));
        try {
          copyTemplates(makeAnswers({ bundler: 'rollup', preset: 'enhanced', uiFramework }), targetDir, '1.0.0', null);
          expect(readFileSync(join(targetDir, 'scripts/babel.config.ts'), 'utf-8'), uiFramework).toBe(expected);
        } finally {
          rmSync(targetDir, { force: true, recursive: true });
        }
      }
    });

    // Every rollup plugin is imported as `<name>Module` for `asPluginFactory` to unwrap. A per-import
    // Directive rendered from inside the import partial only when that partial came first, so the rule is
    // Exempted for the whole file instead, and no import carries a directive of its own.
    it('exempts the rollup config from no-rename-default rather than each import', () => {
      const targetDir = mkdtempSync(join(tmpdir(), 'cop-rollup-rename-'));
      try {
        copyTemplates(makeAnswers({ bundler: 'rollup', preset: 'enhanced', styling: 'scss', uiFramework: 'react', wasmSupport: 'wasm' }), targetDir, '1.0.0', null);
        expect(readFileSync(join(targetDir, 'scripts/rollup.config.ts'), 'utf-8')).not.toContain('no-rename-default');
        expect(readFileSync(join(targetDir, 'scripts/eslint-config.ts'), 'utf-8')).toMatch(
          /files: \['scripts\/rollup\.config\.ts'\],\n\s+rules: \{\n\s+'import-x\/no-rename-default': 'off'/u
        );
      } finally {
        rmSync(targetDir, { force: true, recursive: true });
      }
    });
  });

  describe('uiFramework feature', () => {
    it('adds svelte packages and build plugin', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'esbuild', preset: 'standalone', uiFramework: 'svelte' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('svelte');
      expect(depNames).toContain('svelte-check');
      expect(depNames).toContain('svelte-preprocess');
      expect(depNames).toContain('esbuild-svelte');
    });

    // Obsidian-dev-utils' esbuild build compiles Svelte with its own copies of these two, so a declaration
    // Here is one depcheck reports as unused. `svelte-check` is the opposite: its `build:compile` refuses to
    // Build unless package.json declares it.
    it.each(['enhanced', 'demo'])('declares only svelte-check of the svelte build tooling on %s + esbuild', (preset) => {
      const builder = buildTemplate(makeAnswers({ bundler: 'esbuild', preset, uiFramework: 'svelte' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('svelte');
      expect(depNames).toContain('svelte-check');
      expect(builder.depcheckIgnores.map((ignore) => ignore.packageName)).toContain('svelte-check');
      expect(depNames).not.toContain('esbuild-svelte');
      expect(depNames).not.toContain('svelte-preprocess');
    });

    it.each([
      ['rollup', true],
      ['webpack', true],
      ['vite', false],
      ['parcel', false]
    ])('declares svelte-preprocess on %s only where its config imports it', (bundler, expected) => {
      const answers = makeAnswers({ bundler, preset: 'enhanced', uiFramework: 'svelte' });
      const depNames = buildTemplate(answers).dependencies.map((d) => d.packageName);
      expect(depNames.includes('svelte-preprocess')).toBe(expected);
      const targetDir = mkdtempSync(join(tmpdir(), 'cop-svelte-preprocess-'));
      try {
        copyTemplates(answers, targetDir, '1.0.0', null);
        const importers = readdirSync(join(targetDir, 'scripts')).filter((name) => readFileSync(join(targetDir, 'scripts', name), 'utf-8').includes('from \'svelte-preprocess\''));
        expect(importers.length > 0, importers.join(', ')).toBe(expected);
      } finally {
        rmSync(targetDir, { force: true, recursive: true });
      }
    });

    it('adds react packages and build plugin for vite', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'vite', uiFramework: 'react' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('react');
      expect(depNames).toContain('react-dom');
      expect(depNames).toContain('@vitejs/plugin-react');
    });

    it('adds preact packages and build plugin for vite', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'vite', uiFramework: 'preact' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('preact');
      expect(depNames).toContain('@preact/preset-vite');
    });

    it('adds preact component files', () => {
      const builder = buildTemplate(makeAnswers({ uiFramework: 'preact' }));
      const files = [...builder.templateFiles];
      expect(files).toContain('src/preact-components/sample-preact-component.tsx');
      expect(files).toContain('src/views/sample-preact-view.tsx');
    });

    it('adds solid packages and build plugin for vite', () => {
      const builder = buildTemplate(makeAnswers({ bundler: 'vite', uiFramework: 'solid' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('solid-js');
      expect(depNames).toContain('vite-plugin-solid');
    });

    it('adds solid component files', () => {
      const builder = buildTemplate(makeAnswers({ uiFramework: 'solid' }));
      const files = [...builder.templateFiles];
      expect(files).toContain('src/solid-components/sample-solid-component.tsx');
      expect(files).toContain('src/views/sample-solid-view.tsx');
    });

    it('adds lit packages and files', () => {
      const builder = buildTemplate(makeAnswers({ uiFramework: 'lit' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('lit');
      const files = [...builder.templateFiles];
      expect(files).toContain('src/lit-elements/sample-lit-element.ts');
      expect(files).toContain('src/views/sample-lit-view.ts');
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

    it('emits the branch gate on both obsidian-dev-utils presets and not on standalone', () => {
      for (const preset of ['enhanced', 'demo']) {
        const builder = buildTemplate(makeAnswers({ preset }));
        expect(builder.scripts['gate'], preset).toBe('jiti scripts/gate.ts');
        expect([...builder.templateFiles], preset).toContain('scripts/gate.ts');
        expect(builder.partials.has('has-gate'), preset).toBe(true);
      }

      // `gate` is imported from obsidian-dev-utils, which standalone may not depend on.
      const standalone = buildTemplate(makeAnswers({ preset: 'standalone' }));
      expect(standalone.scripts['gate']).toBeUndefined();
      expect([...standalone.templateFiles]).not.toContain('scripts/gate.ts');
    });

    it('omits the branch gate when an answer leaves out a script gate() requires', () => {
      // `gate()` runs these through `npmRun`, which throws on a script the project does not define, so a
      // Gate emitted here would die on its first step.
      const noneAnswers: Partial<Answers>[] = [
        { formatter: 'none' },
        { spellChecker: 'none' },
        { markdownLinter: 'none' },
        { linter: 'none' }
      ];
      for (const overrides of noneAnswers) {
        const builder = buildTemplate(makeAnswers({ preset: 'enhanced', ...overrides }));
        const label = JSON.stringify(overrides);
        expect(builder.scripts['gate'], label).toBeUndefined();
        expect([...builder.templateFiles], label).not.toContain('scripts/gate.ts');
      }

      // `demo` forces the linter, markdown linter and spell checker back in, so only the formatter can
      // Take the gate away there. The check reads the registered scripts, not the answers, for this.
      expect(buildTemplate(makeAnswers({ formatter: 'none', preset: 'demo' })).scripts['gate']).toBeUndefined();
      expect(buildTemplate(makeAnswers({ linter: 'none', markdownLinter: 'none', preset: 'demo', spellChecker: 'none' })).scripts['gate'])
        .toBe('jiti scripts/gate.ts');
    });

    it('both obsidian-dev-utils presets add the shared dev-utils partial', () => {
      for (const preset of ['enhanced', 'demo']) {
        const builder = buildTemplate(makeAnswers({ preset }));
        expect(builder.partials.has('dev-utils'), preset).toBe(true);
      }
    });

    it('keeps the two obsidian-dev-utils presets mutually exclusive', () => {
      // A file with both an `_enhanced` and a `_demo` whole-file partial is composed by concatenating
      // Every match, so a `demo` build that also carried `enhanced` emitted `src/plugin.ts` twice over.
      const demoPartials = buildTemplate(makeAnswers({ preset: 'demo' })).partials;
      expect(demoPartials.has('demo')).toBe(true);
      expect(demoPartials.has('enhanced')).toBe(false);

      const enhancedPartials = buildTemplate(makeAnswers({ preset: 'enhanced' })).partials;
      expect(enhancedPartials.has('enhanced')).toBe(true);
      expect(enhancedPartials.has('demo')).toBe(false);
    });
  });

  describe('wasmSupport feature', () => {
    const BUNDLERS = ['esbuild', 'parcel', 'rollup', 'vite', 'webpack'];

    // `WASM_PLUGINS` listed only the three bundlers that need a plugin, and a bundler missing from it
    // Threw rather than resolving to "no plugin needed" -- so `wasm` with parcel or with webpack took
    // The whole generation down. Both are legal answers, and between them they are two fifths of the
    // Bundler question.
    it('builds a plan for wasm with every bundler', () => {
      for (const bundler of BUNDLERS) {
        expect(() => buildTemplate(makeAnswers({ bundler, wasmSupport: 'wasm' })), `${bundler} + wasm`).not.toThrow();
      }
    });

    it('registers the wasm sources for every bundler', () => {
      for (const bundler of BUNDLERS) {
        const files = [...buildTemplate(makeAnswers({ bundler, wasmSupport: 'wasm' })).templateFiles];
        expect(files, bundler).toContain('src/wasm.d.ts');
        expect(files, bundler).toContain('src/wasm/answer.ts');
        expect(files, bundler).toContain('src/wasm/sample-command.ts');
        expect(files, bundler).toContain('src/wasm/module.wasm');
      }
    });

    // The whole reason the answer now ships a module: five bundler integrations were declared, installed
    // And never exercised, because nothing in the emitted project imported a `.wasm`. Both files below
    // Have to exist per bundler -- the declaration because each bundler's import yields a different
    // Thing, the loader because each reaches the bytes differently -- and a sixth bundler added without
    // Either is a project whose `src/wasm/answer.ts` renders EMPTY and still compiles.
    it('has a declaration and a loader on disk for every bundler', () => {
      const templatesDir = join(getScriptDir(), '..', 'templates', 'default', 'src');
      for (const bundler of BUNDLERS) {
        expect(existsSync(join(templatesDir, `wasm.d.ts_${bundler}.ejs`)), `wasm.d.ts_${bundler}.ejs`).toBe(true);
        expect(existsSync(join(templatesDir, 'wasm', `answer.ts_${bundler}.ejs`)), `answer.ts_${bundler}.ejs`).toBe(true);
      }
    });

    // The shipped bytes, run. Node has a WebAssembly implementation built in, so this needs no bundler,
    // No install and no new dependency -- and it is the only check that says the binary in the template
    // Tree is a module rather than 39 bytes that look like one.
    it('ships a module that really answers 42', () => {
      const WASM_ANSWER = 42;
      const modulePath = join(getScriptDir(), '..', 'templates', 'default', 'src', 'wasm', 'module.wasm');
      const instance = new WebAssembly.Instance(new WebAssembly.Module(readFileSync(modulePath)));
      expect((instance.exports['answer'] as () => number)()).toBe(WASM_ANSWER);
    });

    // Four of the five need no package, and each is a decision: esbuild's own `binary` loader,
    // Webpack's `asset/inline` rule, parcel's `data-url:` scheme, and vite's asset import. The two
    // Plugins that WERE installed here -- `esbuild-plugin-wasm` and `vite-plugin-wasm` -- both follow
    // The ESM-integration proposal and so emit a top-level `await`, which neither bundler supports for
    // The `cjs` output Obsidian loads.
    it('adds a bundler plugin only where the bundler needs one', () => {
      function wasmPackages(bundler: string): string[] {
        return buildTemplate(makeAnswers({ bundler, wasmSupport: 'wasm' })).dependencies
          .map((dependency) => dependency.packageName)
          .filter((name) => name.includes('wasm'));
      }

      expect(wasmPackages('esbuild')).toEqual([]);
      expect(wasmPackages('rollup')).toEqual(['@rollup/plugin-wasm']);
      expect(wasmPackages('vite')).toEqual([]);
      expect(wasmPackages('parcel')).toEqual([]);
      expect(wasmPackages('webpack')).toEqual([]);
    });

    it('still refuses a bundler nobody has decided how to reach WebAssembly with', () => {
      expect(() => buildTemplate(makeAnswers({ bundler: 'no-such-bundler', wasmSupport: 'wasm' }))).toThrow();
    });
  });

  describe('markdownLinter feature', () => {
    it('adds markdownlint scripts and files', () => {
      const builder = buildTemplate(makeAnswers({ markdownLinter: 'markdownlint' }));
      expect(builder.scripts['lint:md']).toBe('jiti scripts/lint-md.ts');
      expect(builder.scripts['lint:md:fix']).toBe('jiti scripts/lint-md-fix.ts');
      // `markdownlint-cli2` discovers no config named `.mts`; the `.mjs` wrapper plus a `scripts/` config
      // Is the shape both it and the obsidian-dev-utils runner read.
      expect([...builder.templateFiles]).toContain('.markdownlint-cli2.mjs');
      expect([...builder.templateFiles]).toContain('scripts/markdownlint-cli2-config.ts');
      expect([...builder.templateFiles]).toContain('scripts/lint-md.ts');
      expect([...builder.templateFiles]).toContain('scripts/lint-md-fix.ts');
    });

    // The dev-utils presets spread obsidian-dev-utils' shared config, so the two packages only the inlined
    // Standalone config imports would be declared for nothing there.
    it('declares markdownlint and its relative-links rule only on the standalone preset', () => {
      for (const preset of ['enhanced', 'demo']) {
        const packages = buildTemplate(makeAnswers({ markdownLinter: 'markdownlint', preset })).dependencies.map((d) => d.packageName);
        expect(packages).not.toContain('markdownlint');
        expect(packages).not.toContain('markdownlint-rule-relative-links');
      }

      const packages = buildTemplate(makeAnswers({ markdownLinter: 'markdownlint', preset: 'standalone' })).dependencies.map((d) => d.packageName);
      expect(packages).toContain('markdownlint');
      expect(packages).toContain('markdownlint-rule-relative-links');
    });
  });

  // `obsidianmd/validate-license` in the shared ESLint config fails a LICENSE whose year is not the current
  // One, so a project without the bump goes red every 1 January.
  describe('update-license-year workflow', () => {
    it('is emitted on both dev-utils presets whatever the gitHubActions answer, and not on standalone', () => {
      expect([...buildTemplate(makeAnswers({ gitHubActions: 'none', preset: 'enhanced' })).templateFiles]).toContain('.github/workflows/update-license-year.yml');
      expect([...buildTemplate(makeAnswers({ gitHubActions: 'none', preset: 'demo' })).templateFiles]).toContain('.github/workflows/update-license-year.yml');
      expect([...buildTemplate(makeAnswers({ preset: 'standalone' })).templateFiles]).not.toContain('.github/workflows/update-license-year.yml');
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

  describe('styling feature', () => {
    it('adds postcss packages and files', () => {
      const builder = buildTemplate(makeAnswers({ styling: 'postcss' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('postcss');
      expect(depNames).toContain('autoprefixer');
      expect([...builder.templateFiles]).toContain('postcss.config.cjs');
      expect([...builder.templateFiles]).toContain('scripts/postcss.config.ts');
    });

    it('adds tailwind packages and files', () => {
      const builder = buildTemplate(makeAnswers({ styling: 'tailwind' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('tailwindcss');
      // Tailwind 4 is compiled by its own CLI, not through PostCSS: PostCSS is unreachable on the
      // Obsidian-dev-utils esbuild path, whose sass plugin claims `.css` ahead of the seam a project can
      // Add plugins to. Compiling first means every bundler receives ordinary CSS.
      expect(depNames).toContain('@tailwindcss/cli');
      expect(depNames).not.toContain('@tailwindcss/postcss');
      expect(depNames).not.toContain('postcss');
      expect([...builder.templateFiles]).toContain('scripts/build-styles.ts');
      expect([...builder.templateFiles]).not.toContain('scripts/postcss.config.ts');
      // Tailwind 4 detects its sources itself and needs no JavaScript config, so neither file is emitted
      // Any more. A v3-shaped `content` array would have been read by nothing.
      expect([...builder.templateFiles]).not.toContain('tailwind.config.ts');
      expect([...builder.templateFiles]).not.toContain('scripts/tailwind.config.ts');
    });

    // The shared ESLint config rejects an unassigned import and a blank line inside one import group, so
    // The side-effect `build-styles.ts` import carries its directive and sits in the relative group.
    it('emits the dev-utils esbuild tailwind build and dev imports as one lint-clean relative group', () => {
      const targetDir = mkdtempSync(join(tmpdir(), 'cop-tailwind-esbuild-'));
      try {
        copyTemplates(makeAnswers({ bundler: 'esbuild', preset: 'enhanced', styling: 'tailwind' }), targetDir, '1.0.0', null);
        for (const script of ['build', 'dev']) {
          const text = readFileSync(join(targetDir, `scripts/${script}.ts`), 'utf-8');
          expect(text, script).toContain([
            'import { wrapCliTask } from \'obsidian-dev-utils/script-utils/cli-utils\';',
            '',
            '// eslint-disable-next-line import-x/no-unassigned-import -- Importing the module RUNS the style build; there is nothing to bind.',
            'import \'./build-styles.ts\';',
            'import { customEsbuildPlugins } from \'./esbuild-plugins.ts\';',
            ''
          ].join('\n'));
        }
      } finally {
        rmSync(targetDir, { force: true, recursive: true });
      }
    });

    it('adds css modules files', () => {
      const builder = buildTemplate(makeAnswers({ styling: 'css-modules' }));
      const files = [...builder.templateFiles];
      expect(files).toContain('src/styles/main.module.css');
      expect(files).toContain('src/styles/css-modules.d.ts');
    });
  });

  describe('internationalization feature', () => {
    it('adds i18next files and dependency', () => {
      const builder = buildTemplate(makeAnswers({ internationalization: 'i18next' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('i18next');
      const files = [...builder.templateFiles];
      expect(files).toContain('src/i18n/index.ts');
      expect(files).toContain('src/i18n/locales/en.json');
    });

    // `src/i18n/index.ts` imports the locale as JSON, which rollup alone cannot parse without a plugin.
    it('gives rollup a JSON plugin for i18next, and no other bundler one', () => {
      for (const bundler of ['esbuild', 'parcel', 'rollup', 'vite', 'webpack']) {
        const builder = buildTemplate(makeAnswers({ bundler, internationalization: 'i18next' }));
        const depNames = builder.dependencies.map((d) => d.packageName);
        expect(depNames.includes('@rollup/plugin-json'), bundler).toBe(bundler === 'rollup');
      }

      const targetDir = mkdtempSync(join(tmpdir(), 'cop-rollup-json-'));
      try {
        copyTemplates(makeAnswers({ bundler: 'rollup', internationalization: 'i18next' }), targetDir, '1.0.0', null);
        const config = readFileSync(join(targetDir, 'scripts/rollup.config.ts'), 'utf-8');
        expect(config).toContain('import jsonModule from \'@rollup/plugin-json\';');
        expect(config).toContain('const json = asPluginFactory(jsonModule);');
        expect(config).toContain('    json(),');
      } finally {
        rmSync(targetDir, { force: true, recursive: true });
      }
    });

    it('adds typesafe-i18n files and dependency', () => {
      const builder = buildTemplate(makeAnswers({ internationalization: 'typesafe-i18n' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('typesafe-i18n');
      const files = [...builder.templateFiles];
      expect(files).toContain('src/i18n/index.ts');
      expect(files).toContain('src/i18n/en/index.ts');
      expect(files).toContain('.typesafe-i18n.json');
    });

    it('adds no files for none', () => {
      const builder = buildTemplate(makeAnswers({ internationalization: 'none' }));
      const files = [...builder.templateFiles];
      expect(files).not.toContain('src/i18n/index.ts');
    });
  });

  describe('gitHubActions feature', () => {
    it('adds ci and release workflows for ci-and-release', () => {
      const builder = buildTemplate(makeAnswers({ gitHubActions: 'ci-and-release' }));
      const files = [...builder.templateFiles];
      expect(files).toContain('.github/workflows/ci.yml');
      expect(files).toContain('.github/workflows/release.yml');
    });

    it('adds only ci workflow for ci', () => {
      const builder = buildTemplate(makeAnswers({ gitHubActions: 'ci' }));
      const files = [...builder.templateFiles];
      expect(files).toContain('.github/workflows/ci.yml');
      expect(files).not.toContain('.github/workflows/release.yml');
    });

    it('adds no workflows for none', () => {
      const builder = buildTemplate(makeAnswers({ gitHubActions: 'none' }));
      const files = [...builder.templateFiles];
      expect(files).not.toContain('.github/workflows/ci.yml');
      expect(files).not.toContain('.github/workflows/release.yml');
    });
  });

  describe('commitLinting feature', () => {
    it('adds commitlint and husky files for conventional-commits', () => {
      const builder = buildTemplate(makeAnswers({ commitLinting: 'conventional-commits' }));
      const files = [...builder.templateFiles];
      expect(files).toContain('commitlint.config.ts');
      expect(files).toContain('scripts/commitlint-config.ts');
      expect(files).toContain('.husky/commit-msg');
      expect(files).toContain('.husky/pre-commit');
      expect(files).toContain('.nano-staged.mjs');
      expect(files).toContain('scripts/nano-staged-config.ts');
    });

    it('adds commitlint and husky dependencies', () => {
      const builder = buildTemplate(makeAnswers({ commitLinting: 'conventional-commits' }));
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('@commitlint/cli');
      expect(depNames).toContain('@commitlint/config-conventional');
      expect(depNames).toContain('husky');
      expect(depNames).toContain('nano-staged');
    });

    it('adds no files for none', () => {
      const builder = buildTemplate(makeAnswers({ commitLinting: 'none' }));
      const files = [...builder.templateFiles];
      expect(files).not.toContain('commitlint.config.ts');
      expect(files).not.toContain('.husky/commit-msg');
    });

    it('keeps the pre-commit hook when commit linting is declined but a linter is chosen', () => {
      const builder = buildTemplate(makeAnswers({ commitLinting: 'none', formatter: 'none', linter: 'eslint', markdownLinter: 'none' }));
      const files = [...builder.templateFiles];
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(files).toContain('.husky/pre-commit');
      expect(files).toContain('.nano-staged.mjs');
      expect(files).toContain('scripts/nano-staged-config.ts');
      expect(files).toContain('scripts/prepare.ts');
      expect(files).not.toContain('.husky/commit-msg');
      expect(depNames).toContain('husky');
      expect(depNames).toContain('nano-staged');
      expect(depNames).not.toContain('@commitlint/cli');
      expect(builder.scripts).toHaveProperty('prepare');
    });

    it('emits only the commit-msg hook when nothing registers a staged-files command', () => {
      const builder = buildTemplate(makeAnswers({ commitLinting: 'conventional-commits', formatter: 'none', linter: 'none', markdownLinter: 'none' }));
      const files = [...builder.templateFiles];
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(files).toContain('.husky/commit-msg');
      expect(files).toContain('scripts/prepare.ts');
      expect(files).not.toContain('.husky/pre-commit');
      expect(files).not.toContain('scripts/nano-staged-config.ts');
      expect(depNames).toContain('husky');
      expect(depNames).not.toContain('nano-staged');
    });

    it('emits no husky at all when no hook has anything to run', () => {
      const builder = buildTemplate(makeAnswers({ commitLinting: 'none', formatter: 'none', linter: 'none', markdownLinter: 'none' }));
      const files = [...builder.templateFiles];
      expect(files.filter((file) => file.startsWith('.husky/') || file.includes('nano-staged') || file === 'scripts/prepare.ts')).toEqual([]);
      expect(builder.dependencies.map((d) => d.packageName)).not.toContain('husky');
      expect(builder.scripts).not.toHaveProperty('prepare');
    });
  });

  describe('demo preset', () => {
    it('activates override features even when not selected', () => {
      const builder = buildTemplate(makeAnswers({
        linter: 'none',
        markdownLinter: 'none',
        preset: 'demo',
        spellChecker: 'none',
        testRunner: 'vitest',
        uiFramework: 'none'
      }));
      // Demo should activate react, svelte, eslint, markdownlint, cspell, scss, codemirror
      const depNames = builder.dependencies.map((d) => d.packageName);
      expect(depNames).toContain('react');
      expect(depNames).toContain('svelte');
      expect(depNames).toContain('eslint');
      expect(depNames).toContain('cspell');

      expect(builder.partials.has('react')).toBe(true);
      expect(builder.partials.has('svelte')).toBe(true);
      expect(builder.partials.has('eslint')).toBe(true);
      expect(builder.partials.has('cspell')).toBe(true);
      expect(builder.partials.has('scss')).toBe(true);
      expect(builder.partials.has('codemirror')).toBe(true);
    });

    // The one thing the demo preset cannot force a second answer into. `jsx` / `jsxImportSource` are
    // Project-global -- once in `tsconfig.json`, once more in whichever bundler config was chosen -- so
    // Forcing react in beside `preact` or `solid` emitted a duplicate `"jsx"` key and compiled one
    // Framework's components against the other's runtime (TS2345). The explicit answer wins, exactly as
    // It does for demo + biome above. Svelte and Vue own no pragma and stay forced beside everything,
    // Which is what keeps the reachable demo case -- `prompts.ts` pins `uiFramework` to `none` for this
    // Preset -- emitting all three.
    it('drops a forced UI framework that would fight the chosen one for the JSX runtime', () => {
      const expected = [
        ['none', true],
        ['lit', true],
        ['react', true],
        ['svelte', true],
        ['vue', true],
        ['preact', false],
        ['solid', false]
      ] as const;

      for (const [uiFramework, forcesReact] of expected) {
        const builder = buildTemplate(makeAnswers({ preset: 'demo', uiFramework }));
        expect(builder.partials.has('react'), `demo + ${uiFramework}`).toBe(forcesReact);
        expect(builder.partials.has(uiFramework), `demo + ${uiFramework}`).toBe(true);
        // Neither owns a JSX pragma, so no answer can displace them.
        expect(builder.partials.has('svelte'), `demo + ${uiFramework}`).toBe(true);
        expect(builder.partials.has('vue'), `demo + ${uiFramework}`).toBe(true);
      }
    });

    // A forced framework whose view nothing registers is dead code the bundler never compiles -- which
    // Is how the demo preset advertised Vue while rollup could not build it.
    it('registers a view for every framework it forces in', () => {
      const targetDir = mkdtempSync(join(tmpdir(), 'cop-demo-views-'));
      try {
        copyTemplates(makeAnswers({ preset: 'demo' }), targetDir, '1.0.0', null);
        const plugin = readFileSync(join(targetDir, 'src/plugin.ts'), 'utf-8');
        for (const view of ['SampleReactView', 'SampleSvelteView', 'SampleVueView']) {
          expect(plugin, view).toContain(`(leaf) => new ${view}(leaf)`);
        }
      } finally {
        rmSync(targetDir, { force: true, recursive: true });
      }
    });

    // A view nothing registers is never imported, so no bundler compiles its component and a green build
    // Proves nothing about the framework. `standalone` shipped every framework's view that way.
    const FRAMEWORK_VIEWS = [
      ['lit', 'SampleLitView'],
      ['preact', 'SamplePreactView'],
      ['react', 'SampleReactView'],
      ['solid', 'SampleSolidView'],
      ['svelte', 'SampleSvelteView'],
      ['vue', 'SampleVueView']
    ] as const;

    it.each(['standalone', 'enhanced'].flatMap((preset) => FRAMEWORK_VIEWS.map(([uiFramework, view]) => [preset, uiFramework, view])))(
      'registers the %s + %s view',
      (preset, uiFramework, view) => {
        const targetDir = mkdtempSync(join(tmpdir(), 'cop-views-'));
        try {
          copyTemplates(makeAnswers({ preset, uiFramework }), targetDir, '1.0.0', null);
          const plugin = readFileSync(join(targetDir, 'src/plugin.ts'), 'utf-8');
          expect(plugin).toContain(`(leaf) => new ${view}(leaf)`);
          expect(plugin.match(/private openViewOnLayoutReady\(/g)).toHaveLength(1);
        } finally {
          rmSync(targetDir, { force: true, recursive: true });
        }
      }
    );
  });

  // An ignore for a package the project never declares is a false-positive entry for nothing, and
  // Registering one beside the wrong `addPackage` branch is exactly how it would happen. Every value of
  // Every question, under each preset, since several ignores depend on the preset as well.
  // Each of these was declared and reached by nothing in the project, which depcheck reports as unused:
  // Obsidian-dev-utils depends on its own copy of the first two, and no sample imports the last two.
  describe('packages nothing in the project reaches', () => {
    it.each(['enhanced', 'demo'])('declares no esbuild-sass-plugin on %s + esbuild', (preset) => {
      const depNames = buildTemplate(makeAnswers({ bundler: 'esbuild', preset, styling: 'scss' })).dependencies.map((d) => d.packageName);
      expect(depNames).not.toContain('esbuild-sass-plugin');
      expect(depNames).toContain('sass-embedded');
    });

    it('declares esbuild-sass-plugin on standalone + esbuild, whose build script imports it', () => {
      const depNames = buildTemplate(makeAnswers({ bundler: 'esbuild', preset: 'standalone', styling: 'scss' })).dependencies.map((d) => d.packageName);
      expect(depNames).toContain('esbuild-sass-plugin');
    });

    it.each(['standalone', 'enhanced', 'demo'])('declares neither type-fest nor @codemirror/language on %s', (preset) => {
      const depNames = buildTemplate(makeAnswers({ editorExtensions: 'codemirror', preset })).dependencies.map((d) => d.packageName);
      expect(depNames).not.toContain('type-fest');
      expect(depNames).not.toContain('@codemirror/language');
      expect(depNames).toContain('@codemirror/state');
      expect(depNames).toContain('@codemirror/view');
    });
  });

  describe('depcheck ignores', () => {
    it('names only packages the project declares', () => {
      for (const preset of ['standalone', 'enhanced', 'demo']) {
        for (const dimension of ANSWER_SPACE) {
          for (const value of dimension.values) {
            const answers = makeSpaceAnswers({ [dimension.answerKey]: value, preset });
            const builder = buildTemplate(answers);
            const declared = new Set(builder.dependencies.map((dependency) => dependency.packageName));
            for (const { packageName } of builder.depcheckIgnores) {
              expect(declared, `${packageName} under preset=${preset} ${dimension.answerKey}=${value}`).toContain(packageName);
            }
          }
        }
      }
    });
  });

  describe('all scripts use default convention', () => {
    it('every script follows jiti scripts/{name}.ts pattern', () => {
      const configs: Partial<Answers>[] = [
        {},
        { e2eTestRunner: 'wdio-obsidian', testRunner: 'vitest' },
        { formatter: 'dprint', preset: 'standalone', testRunner: 'jest' }
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

describe('copyTemplates', () => {
  interface ParsedDepcheckRc {
    comment: string[];
    ignores: string[];
  }

  interface ParsedPackageJson {
    scripts: Record<string, string>;
  }

  const CURRENT_YEAR = 2026;

  function makeAnswers(overrides: Partial<Answers> = {}): Answers {
    return {
      apiSubset: 'official',
      authorGitHubName: 'testuser',
      authorName: 'Test User',
      bundler: 'esbuild',
      commitLinting: 'none',
      coverageBadge: 'none',
      currentYear: CURRENT_YEAR,
      defaultBranch: 'main',
      e2eTestRunner: 'none',
      editorExtensions: 'none',
      formatter: 'none',
      fundingPlatform: 'custom',
      fundingUrl: '',
      fundingUsername: 'user',
      gitHubActions: 'none',
      gitHubIssueTemplates: 'bug-and-feature',
      hotReload: 'hot-reload-plugin',
      internationalization: 'none',
      linter: 'none',
      markdownLinter: 'none',
      obsidianConfigFolder: '',
      packageManager: 'npm',
      platformSupport: 'desktop-and-mobile',
      pluginDescription: 'A test plugin.',
      pluginId: 'my-tool',
      pluginName: 'My Tool',
      preset: 'standalone',
      spellChecker: 'none',
      styling: 'none',
      testRunner: 'none',
      uiFramework: 'none',
      wasmSupport: 'none',
      ...overrides
    };
  }

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
    expect(pkg['name']).toBe('my-tool');
    expect(pkg['description']).toBe('A test plugin.');
  });

  it('creates manifest.json with correct fields', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['id']).toBe('my-tool');
    expect(manifest['name']).toBe('My Tool');
    expect(manifest['author']).toBe('testuser');
  });

  // `isDesktopOnly` is required in every Obsidian manifest, and it went missing from all of them: the
  // Two `manifest.json@platform_*` partials were on disk and `manifest.json.ejs` asked for the section,
  // But `platformSupport` was absent from `FEATURE_REGISTRIES`, so nothing ever contributed either name
  // And the section rendered as nothing. The answer was prompted for and discarded.
  it('stamps the platform support answer into the manifest', () => {
    copyTemplates(makeAnswers({ platformSupport: 'desktop-only' }), targetDir, '1.0.0', null);
    const desktopOnly = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(desktopOnly['isDesktopOnly']).toBe(true);
  });

  it('stamps mobile support into the manifest when both platforms are supported', () => {
    copyTemplates(makeAnswers({ platformSupport: 'desktop-and-mobile' }), targetDir, '1.0.0', null);
    const both = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(both['isDesktopOnly']).toBe(false);
  });

  it('stamps the resolved minAppVersion into the manifest and versions.json', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null, new Map(), '1.13.7');
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    const versions = JSON.parse(readFileSync(join(targetDir, 'versions.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['minAppVersion']).toBe('1.13.7');
    // `versions.json` maps each released version to the app version it needs, so its only entry has to
    // Agree with the manifest it ships next to.
    expect(versions[manifest['version'] as string]).toBe('1.13.7');
  });

  it('falls back to a manifest that claims no minimum app version', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['minAppVersion']).toBe('0.0.0');
  });

  // The skip used to record the USER's hash, so the next update saw a file matching its record, took it for
  // Untouched and overwrote it, listed under "Updated". The protection was one update deep.
  it('keeps skipping a hand-edited file on every later update', () => {
    const edited = 'My own README.\n';
    let config = copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const generatedHash = config.fileHashes['README.md'];
    writeFileSync(join(targetDir, 'README.md'), edited);

    for (const version of ['1.0.1', '1.0.2', '1.0.3']) {
      config = copyTemplates(makeAnswers(), targetDir, version, config);
      expect(readFileSync(join(targetDir, 'README.md'), 'utf-8'), version).toBe(edited);
      expect(config.fileHashes['README.md'], version).toBe(generatedHash);
    }
  });

  it('resumes updating a hand-edited file once it is deleted', () => {
    const config = copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const generated = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    writeFileSync(join(targetDir, 'README.md'), 'My own README.\n');
    const skipping = copyTemplates(makeAnswers(), targetDir, '1.0.1', config);
    rmSync(join(targetDir, 'README.md'));
    copyTemplates(makeAnswers(), targetDir, '1.0.2', skipping);
    expect(readFileSync(join(targetDir, 'README.md'), 'utf-8')).toBe(generated);
  });

  it('adds the commit script only when commit linting is on', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits' }), targetDir, '1.0.0', null);
    const withLinting = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as ParsedPackageJson;
    expect(withLinting.scripts['commit']).toBe('jiti scripts/commit.ts');
    expect(existsSync(join(targetDir, 'scripts', 'commit.ts'))).toBe(true);

    rmSync(targetDir, { force: true, recursive: true });
    targetDir = mkdtempSync(join(tmpdir(), 'obsidian-plugin-test-'));
    copyTemplates(makeAnswers({ commitLinting: 'none' }), targetDir, '1.0.0', null);
    const withoutLinting = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as ParsedPackageJson;
    expect(withoutLinting.scripts).not.toHaveProperty('commit');
  });

  it('triggers the CI workflow on the chosen default branch', () => {
    for (const defaultBranch of ['main', 'master', 'trunk']) {
      rmSync(targetDir, { force: true, recursive: true });
      copyTemplates(makeAnswers({ defaultBranch, gitHubActions: 'ci' }), targetDir, '1.0.0', null);
      const ci = readFileSync(join(targetDir, '.github', 'workflows', 'ci.yml'), 'utf-8');
      // `git init -b <defaultBranch>` uses the same answer, so a workflow naming a different branch is
      // A workflow that never fires.
      expect(ci, defaultBranch).toContain(`branches: [${defaultBranch}]`);
    }
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

  it('derives one funding URL for the manifest, the README and FUNDING.yml from the platform and handle', () => {
    copyTemplates(makeAnswers({ fundingPlatform: 'buy-me-a-coffee', fundingUrl: 'https://ignored.example.com', fundingUsername: 'someone' }), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['fundingUrl']).toBe('https://www.buymeacoffee.com/someone');
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('<a href="https://www.buymeacoffee.com/someone"');
    // Exactly the line every real plugin carries -- not GitHub's stock template with every platform blank.
    expect(readFileSync(join(targetDir, '.github', 'FUNDING.yml'), 'utf-8')).toBe('# These are supported funding model platforms\n\nbuy_me_a_coffee: someone\n');
  });

  it('emits no FUNDING.yml, funding badge or Support section when the platform is none', () => {
    copyTemplates(makeAnswers({ fundingPlatform: 'none', fundingUrl: 'https://ignored.example.com' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, '.github', 'FUNDING.yml'))).toBe(false);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).not.toContain('## Support');
    expect(readme).not.toContain('ignored.example.com');
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest).not.toHaveProperty('fundingUrl');
  });

  it('writes a custom funding URL into FUNDING.yml as a quoted one-element list', () => {
    copyTemplates(makeAnswers({ fundingPlatform: 'custom', fundingUrl: 'https://example.com/it\'s#me' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, '.github', 'FUNDING.yml'), 'utf-8')).toContain('custom: [\'https://example.com/it\'\'s#me\']\n');
  });

  // EJS's `<%=` escapes for HTML, which is right in the README's `<a href>` and wrong in JSON: a funding
  // URL with two query parameters shipped as `&amp;`, and Obsidian reads the manifest verbatim.
  it('writes a funding URL into manifest.json unescaped, and still as valid JSON', () => {
    const fundingUrl = 'https://example.com/pay?ref=a%20b&x=1&q="<it\'s>"\\';
    copyTemplates(makeAnswers({ fundingPlatform: 'custom', fundingUrl }), targetDir, '1.0.0', null);
    const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest['fundingUrl']).toBe(fundingUrl);
  });

  it('round-trips a free-text description through every JSON file that carries it', () => {
    const pluginDescription = 'Links notes & attachments, "quoted" <tags> and a back\\slash.';
    copyTemplates(makeAnswers({ pluginDescription }), targetDir, '1.0.0', null);
    for (const file of ['manifest.json', 'package.json']) {
      const json = JSON.parse(readFileSync(join(targetDir, file), 'utf-8')) as Record<string, unknown>;
      expect(json['description'], file).toBe(pluginDescription);
    }
  });

  it('writes the vault config folder into .env verbatim, not HTML-escaped', () => {
    const obsidianConfigFolder = 'C:\\Users\\Tom & Jerry\\vault\\.obsidian';
    copyTemplates(makeAnswers({ obsidianConfigFolder }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, '.env'), 'utf-8')).toContain(`OBSIDIAN_CONFIG_FOLDER=${obsidianConfigFolder}\n`);
  });

  // The tests above cover the answers known today; this covers the next interpolation somebody adds.
  // Inside a JSON string, `<%=` escapes for HTML and `<%-` escapes for nothing, so both are wrong there.
  it('interpolates into no JSON template string except through JSON.stringify', () => {
    const templatesDir = join(getScriptDir(), '..', 'templates', 'default');
    function walk(dir: string): string[] {
      return readdirSync(join(templatesDir, dir), { withFileTypes: true }).flatMap((entry) => {
        const relativePath = dir === '' ? entry.name : `${dir}/${entry.name}`;
        return entry.isDirectory() ? walk(relativePath) : [relativePath];
      });
    }
    const offenders = walk('')
      .filter((path) => /\.jsonc?[_@.]/.test(path.split('/').pop() ?? ''))
      .flatMap((path) =>
        readFileSync(join(templatesDir, path), 'utf-8')
          .split('\n')
          // An odd number of quotes before the tag puts it inside a JSON string.
          .filter((line) => [...line.matchAll(/<%[=-]/g)].some((match) => /^[^"]*"(?:[^"]*"[^"]*")*[^"]*$/.test(line.slice(0, match.index))))
          .map((line) => `${path}: ${line.trim()}`)
      );
    expect(offenders).toEqual([]);
  });

  it('puts the badges on one source line, in the order the real plugins use', () => {
    copyTemplates(makeAnswers({ coverageBadge: 'coverage-badge', fundingPlatform: 'buy-me-a-coffee', fundingUsername: 'testuser' }), targetDir, '1.0.0', null);
    // Line 3: the title, a blank line, then the badges.
    const [, , badgeLine] = readFileSync(join(targetDir, 'README.md'), 'utf-8').split('\n');
    // Byte-identical to the real plugins' line, so the generator and the plugins cannot drift apart unseen.
    expect(badgeLine).toBe([
      '[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/testuser)',
      '[![GitHub release](https://img.shields.io/github/v/release/testuser/obsidian-my-tool)](https://github.com/testuser/obsidian-my-tool/releases)',
      '[![GitHub downloads](https://img.shields.io/github/downloads/testuser/obsidian-my-tool/total)](https://github.com/testuser/obsidian-my-tool/releases)',
      '[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/testuser/obsidian-my-tool)'
    ].join(' '));
  });

  it('carries an old project\'s funding URL forward as a platform and handle', () => {
    const cases: [string, string, string, string][] = [
      ['https://buymeacoffee.com/someone', 'buy-me-a-coffee', 'someone', ''],
      ['https://www.buymeacoffee.com/someone/', 'buy-me-a-coffee', 'someone', ''],
      ['https://ko-fi.com/someone', 'ko-fi', 'someone', ''],
      ['https://example.com/pay?a=1', 'custom', 'testuser', 'https://example.com/pay?a=1'],
      ['', 'none', 'testuser', '']
    ];
    for (const [fundingUrl, fundingPlatform, fundingUsername, migratedUrl] of cases) {
      writeFileSync(
        join(targetDir, '.create-obsidian-plugin.json'),
        JSON.stringify({ answers: { authorGitHubName: 'testuser', fundingUrl, gitHubFunding: 'funding-yml' }, fileHashes: {}, generatorVersion: '1.0.0' })
      );
      const answers = loadConfig(targetDir)?.answers;
      expect(answers, fundingUrl).toMatchObject({ coverageBadge: 'none', fundingPlatform, fundingUrl: migratedUrl, fundingUsername });
      expect(answers, fundingUrl).not.toHaveProperty('gitHubFunding');
    }
  });

  // It used to be stored, and the update path that keeps the saved answers kept a copy that went stale once
  // `pluginId` was re-answered -- while the re-prompt path recomputed it.
  it('drops an old project\'s stored pluginShortName and derives it from pluginId instead', () => {
    writeFileSync(
      join(targetDir, '.create-obsidian-plugin.json'),
      JSON.stringify({ answers: { ...makeAnswers(), pluginShortName: 'Stale' }, fileHashes: {}, generatorVersion: '1.0.0' })
    );
    const answers = loadConfig(targetDir)?.answers;
    expect(answers).not.toHaveProperty('pluginShortName');

    copyTemplates(makeAnswers({ ...answers }), targetDir, '1.0.0', null);
    const plugin = readFileSync(join(targetDir, 'src/plugin.ts'), 'utf-8');
    expect(plugin).toContain('MyToolSettingTab');
    expect(plugin).not.toContain('Stale');
  });

  it('creates README with plugin name', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('# My Tool');
  });

  it('leads the README with the plugin description', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    // The README skeleton puts a lead paragraph between the title block and the first section.
    expect(readme.split('## Installation')[0]).toContain('A test plugin.');
  });

  it('orders the README sections per the house skeleton', () => {
    copyTemplates(makeAnswers({ fundingUrl: 'https://example.com/sponsor', preset: 'enhanced' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    const sections = [...readme.matchAll(/^## (?<Title>.+)$/gm)].map((match) => match.groups?.['Title']);
    // The skeleton puts `Demo vault` first, before any feature section.
    expect(sections).toStrictEqual([
      'Demo vault',
      'Installation',
      'Debugging',
      'Contributing',
      'Support',
      'License'
    ]);
  });

  it('links the demo vault from the README for the obsidian-dev-utils presets', () => {
    for (const preset of ['enhanced', 'demo']) {
      rmSync(targetDir, { force: true, recursive: true });
      copyTemplates(makeAnswers({ preset }), targetDir, '1.0.0', null);
      const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
      expect(readme, preset).toContain('## Demo vault');
      // All three access routes the skeleton names, plus the plain-markdown entry point.
      expect(readme, preset).toContain('[Start reading here](<./demo-vault/00 Start.md>)');
      expect(readme, preset).toContain('**My Tool: Open demo vault** command');
      expect(readme, preset).toContain('`my-tool-demo-vault.zip`');
      expect(readme, preset).toContain('a single `my-tool-demo-vault-<version>` folder');
      // The vault's own README names the same unversioned asset and the folder it unzips into.
      const vaultReadme = readFileSync(join(targetDir, 'demo-vault/README.md'), 'utf-8');
      expect(vaultReadme, preset).toContain('download `my-tool-demo-vault.zip`');
      expect(vaultReadme, preset).toContain('select the `my-tool-demo-vault-<version>` folder it unzips into');
      expect(readme, preset).toContain('[`demo-vault/`](./demo-vault/README.md)');
    }
  });

  it('omits the Demo vault section and the vault for the standalone preset', () => {
    copyTemplates(makeAnswers({ preset: 'standalone' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    // `standalone` has no obsidian-dev-utils release flow, so nothing would archive the vault into a
    // Release -- and the skeleton omits a section rather than linking a file that does not exist.
    expect(readme).not.toContain('## Demo vault');
    expect(existsSync(join(targetDir, 'demo-vault'))).toBe(false);
  });

  it('omits the Changelog section, which the generator scaffolds no file for', () => {
    copyTemplates(makeAnswers({ preset: 'enhanced' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).not.toContain('## Changelog');
    expect(existsSync(join(targetDir, 'CHANGELOG.md'))).toBe(false);
  });

  it('scaffolds a demo vault for the obsidian-dev-utils presets', () => {
    copyTemplates(makeAnswers({ preset: 'enhanced' }), targetDir, '1.0.0', null);

    for (const relativePath of ['00 Start.md', '01 Sample commands.md', '02 Settings.md', 'README.md']) {
      const note = readFileSync(join(targetDir, 'demo-vault', relativePath), 'utf-8');
      // Every note opens with an `# H1`; the coverage suite fails one that does not.
      expect(note.startsWith('# '), relativePath).toBe(true);
    }

    const startNote = readFileSync(join(targetDir, 'demo-vault', '00 Start.md'), 'utf-8');
    expect(startNote).toContain('```code-button');
    // Links between notes are Markdown links -- a wikilink renders as literal brackets on GitHub.
    expect(startNote).not.toMatch(/\[\[/);

    const demoSetup = readFileSync(join(targetDir, 'demo-vault/_assets/CodeScriptToolkit/demoSetup.ts'), 'utf-8');
    // The plugin id keys both the command ids and `data.json`; getting it wrong breaks every button.
    expect(demoSetup).toContain('const PLUGIN_ID = \'my-tool\';');

    const startupScript = readFileSync(join(targetDir, 'demo-vault/_assets/CodeScriptToolkit/startup.ts'), 'utf-8');
    // A top-level script throws `this.startupScript.invoke is not a function` when the vault loads.
    expect(startupScript).toContain('export async function invoke(');
  });

  it('documents the WebAssembly command in the demo vault only when both answers ask for it', () => {
    const wasmNote = join(targetDir, 'demo-vault', '03 WebAssembly.md');

    copyTemplates(makeAnswers({ preset: 'enhanced', wasmSupport: 'wasm' }), targetDir, '1.0.0', null);
    const note = readFileSync(wasmNote, 'utf-8');
    expect(note.startsWith('# WebAssembly\n')).toBe(true);
    expect(note).toContain('require(\'/demoSetup.ts\').runSampleWasmAnswerCommand(app);');
    // The coverage suite fails a note that `00 Start.md` does not reach.
    expect(readFileSync(join(targetDir, 'demo-vault', '00 Start.md'), 'utf-8')).toContain('| [03 WebAssembly](<./03 WebAssembly.md>) |');
    expect(readFileSync(join(targetDir, 'demo-vault', '01 Sample commands.md'), 'utf-8')).toContain('## Sample WASM answer');
    // The id the button runs has to be the one `src/wasm/sample-command.ts` registers.
    expect(readFileSync(join(targetDir, 'demo-vault/_assets/CodeScriptToolkit/demoSetup.ts'), 'utf-8')).toContain(':sample-wasm-answer`);');
    expect(readFileSync(join(targetDir, 'src/wasm/sample-command.ts'), 'utf-8')).toContain('id: \'sample-wasm-answer\'');

    rmSync(targetDir, { force: true, recursive: true });
    copyTemplates(makeAnswers({ preset: 'enhanced', wasmSupport: 'none' }), targetDir, '1.0.0', null);
    expect(existsSync(wasmNote)).toBe(false);
    const startNote = readFileSync(join(targetDir, 'demo-vault', '00 Start.md'), 'utf-8');
    expect(startNote).not.toContain('WebAssembly');
    // The seam renders nothing: the table still ends where the next heading starts.
    expect(startNote).toContain('`data.json`. |\n\n## Materials');
    expect(readFileSync(join(targetDir, 'demo-vault', '01 Sample commands.md'), 'utf-8')).not.toContain('WASM');
    expect(readFileSync(join(targetDir, 'demo-vault/_assets/CodeScriptToolkit/demoSetup.ts'), 'utf-8')).not.toContain('wasm');

    // `standalone` answers `wasm` and still ships no vault to document it in.
    expect(buildTemplate(makeAnswers({ preset: 'standalone', wasmSupport: 'wasm' })).templateFiles).not.toContain('demo-vault/03 WebAssembly.md');
  });

  it('commits both plugin ids and none of the injected app.json settings in the demo vault', () => {
    copyTemplates(makeAnswers({ preset: 'enhanced' }), targetDir, '1.0.0', null);

    const communityPlugins = JSON.parse(readFileSync(join(targetDir, 'demo-vault/.obsidian/community-plugins.json'), 'utf-8')) as string[];
    // Listing only the helper is a silent failure: it enables CodeScript Toolkit, not the plugin itself.
    expect(communityPlugins).toStrictEqual(['demo-vault-helper', 'my-tool']);

    const appJson = JSON.parse(readFileSync(join(targetDir, 'demo-vault/.obsidian/app.json'), 'utf-8')) as Record<string, unknown>;
    // These four are injected into the ARCHIVED vault by obsidian-dev-utils; a committed copy is a second
    // Source of truth that nothing reconciles, and the coverage suite fails a vault that carries one.
    for (const injectedSetting of ['defaultViewMode', 'livePreview', 'newLinkFormat', 'useMarkdownLinks']) {
      expect(appJson, injectedSetting).not.toHaveProperty(injectedSetting);
    }
  });

  it('wires both demo-vault suites only for an obsidian-dev-utils preset running vitest', () => {
    const suiteFiles = ['src/demo-vault.no-app.integration.test.ts', 'src/demo-vault-buttons.demo-vault.integration.test.ts'];

    copyTemplates(makeAnswers({ preset: 'enhanced', testRunner: 'vitest' }), targetDir, '1.0.0', null);
    for (const suiteFile of suiteFiles) {
      expect(existsSync(join(targetDir, suiteFile)), suiteFile).toBe(true);
    }
    // A suite whose suffix matches no declared project is collected by nothing and reads like passing.
    const vitestConfig = readFileSync(join(targetDir, 'scripts/vitest-config.ts'), 'utf-8');
    expect(vitestConfig).toContain('integration-tests:demo-vault');
    expect(readFileSync(join(targetDir, 'scripts/test-integration.ts'), 'utf-8')).toContain('integration-tests:demo-vault');
    expect(existsSync(join(targetDir, 'scripts/demo-vault-global-setup.ts'))).toBe(true);

    rmSync(targetDir, { force: true, recursive: true });
    copyTemplates(makeAnswers({ preset: 'standalone', testRunner: 'vitest' }), targetDir, '1.0.0', null);
    for (const suiteFile of suiteFiles) {
      expect(existsSync(join(targetDir, suiteFile)), suiteFile).toBe(false);
    }
  });

  it('renders each preset-specific file exactly once for the demo preset', () => {
    copyTemplates(makeAnswers({ preset: 'demo' }), targetDir, '1.0.0', null);
    // A registered file with no `.ejs` on disk is composed by concatenating EVERY matching partial, so
    // While `demo` also carried the `enhanced` partial each of these was emitted twice over.
    for (const relativePath of ['src/plugin.ts', 'src/plugin-settings.ts', 'src/plugin-settings-component.ts', 'src/plugin-settings-tab.ts']) {
      const content = readFileSync(join(targetDir, relativePath), 'utf-8');
      const declarationCount = [...content.matchAll(/^export class (?<ClassName>\w+)/gm)].filter((match) => match.groups?.['ClassName'] !== 'TypedItem').length;
      expect(declarationCount, relativePath).toBe(1);
    }
  });

  it('creates CONTRIBUTING.md and links it from the README', () => {
    copyTemplates(makeAnswers({ linter: 'eslint' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('[CONTRIBUTING](./CONTRIBUTING.md)');

    const contributing = readFileSync(join(targetDir, 'CONTRIBUTING.md'), 'utf-8');
    expect(contributing).toContain('# Contributing');
    // The per-tool script list moved here with the rest of the development instructions.
    expect(contributing).toContain('`npm run lint` — Run linter');
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

  // Every generated project's `scripts/` imports `node:fs` and friends, and with no `types` entry NOTHING
  // Under `node_modules/@types` reaches the program -- measured: zero packages -- so `standalone` failed
  // Its own `tsc --noEmit` with twelve TS2591s. The dev-utils config and this generator's own tsconfig both
  // Already named what they need; standalone was the one that did not.
  it('names the node types in the tsconfig, for both presets', () => {
    for (const preset of ['standalone', 'enhanced', 'demo']) {
      copyTemplates(makeAnswers({ preset }), targetDir, '1.0.0', null);
      const tsconfig = JSON.parse(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')) as Record<string, Record<string, unknown>>;
      expect(tsconfig['compilerOptions']?.['types'], preset).toContain('node');
    }
  });

  // The types entry named `obsidian-typings` while the dependency added is
  // `@obsidian-typings/obsidian-public-latest`, so `with-unofficial` failed `tsc` with TS2688 on every
  // Preset. Every compared plugin -- including the sample plugin the README advertises as this generator's output --
  // Names the scoped package in both places and carries no import of the old name at all.
  it('names the typings package it actually installs, on both presets', () => {
    for (const preset of ['standalone', 'enhanced']) {
      copyTemplates(makeAnswers({ apiSubset: 'with-unofficial', preset }), targetDir, '1.0.0', null);
      const tsconfig = JSON.parse(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')) as Record<string, Record<string, unknown>>;
      const packageJson = readFileSync(join(targetDir, 'package.json'), 'utf-8');
      expect(tsconfig['compilerOptions']?.['types'], preset).toContain('@obsidian-typings/obsidian-public-latest');
      expect(packageJson, preset).toContain('@obsidian-typings/obsidian-public-latest');
      expect(readFileSync(join(targetDir, 'src/main.ts'), 'utf-8'), preset).not.toContain('obsidian-typings\'');
    }
  });

  // The svelte `compile` partial shells out to `svelte-check`, and only the esbuild bundler partial
  // Renders `import` -- the other four import `execSync` themselves. So esbuild, the DEFAULT bundler,
  // Emitted a build script calling a name it never imported: `tsc` failed and `npm run build` died.
  it('imports execSync into the standalone build script that calls it', () => {
    copyTemplates(makeAnswers({ bundler: 'esbuild', preset: 'standalone', uiFramework: 'svelte' }), targetDir, '1.0.0', null);
    const build = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(build).toContain('svelte-check');
    expect(build).toContain('from \'node:child_process\'');
  });

  // `lint.ts_dev-utils.ejs` used to be a whole-file partial keyed on the preset, so it emitted the
  // Obsidian-dev-utils ESLint runner whatever the linter answer said: `linter: biome` installed biome,
  // Wrote `biome.json`, and then ran eslint, which died looking for a config nobody had written. Now
  // Keyed on the tool first, exactly as the format scripts already were.
  //
  // The demo rows are the subtle ones and are pinned deliberately. `DEMO_OVERRIDES` forces the eslint
  // Partial on regardless of the answer, so demo + biome contributes BOTH tool partials; the biome one
  // Wins because it is inserted first and `render` fixes `renderRoot` on the first match, which leaves
  // The eslint branch resolving its nested `render('preset')` against the wrong base and emitting
  // Nothing. That is the right answer -- the explicit answer beats the demo default -- but it follows
  // From insertion order, so it is asserted rather than left to be rediscovered.
  it('runs the linter that was actually chosen, on every preset', () => {
    const expected = [
      ['standalone', 'eslint', 'eslint .'],
      ['standalone', 'biome', 'biome lint .'],
      ['enhanced', 'eslint', 'obsidian-dev-utils/script-utils/linters/eslint'],
      ['enhanced', 'biome', 'biome lint .'],
      ['demo', 'eslint', 'obsidian-dev-utils/script-utils/linters/eslint'],
      ['demo', 'biome', 'biome lint .'],
      ['demo', 'none', 'obsidian-dev-utils/script-utils/linters/eslint']
    ];

    for (const [preset, linter, marker] of expected) {
      copyTemplates(makeAnswers({ linter: String(linter), preset: String(preset) }), targetDir, '1.0.0', null);
      const lint = readFileSync(join(targetDir, 'scripts/lint.ts'), 'utf-8');
      expect(lint, `${String(preset)} + ${String(linter)}`).toContain(String(marker));
      // One runner, not two concatenated: a file composed from two matching tool partials would carry
      // Both import blocks and fail to compile.
      expect(lint.match(/^import process/gm)?.length ?? 0, `${String(preset)} + ${String(linter)}`).toBe(1);
    }
  });

  // The rendered half of "drops a forced UI framework that would fight the chosen one". `JSON.parse`
  // Accepts a duplicate key and silently keeps the last, so a tsconfig carrying both frameworks' blocks
  // Is valid JSON describing a project that cannot compile -- assert the emitted bytes, not the parse.
  it('emits one JSX runtime, whichever framework the demo preset was given', () => {
    const expected = [
      ['none', '"jsx": "react-jsx"', true],
      ['preact', '"jsxImportSource": "preact"', false],
      ['solid', '"jsxImportSource": "solid-js"', false]
    ] as const;

    for (const [uiFramework, pragma, hasReactSample] of expected) {
      // A fresh directory per case: `copyTemplates` writes, it does not prune, so the shared one would
      // Still hold the previous case's react sample and the absence assertion would never fail.
      const caseDir = mkdtempSync(join(tmpdir(), 'cop-demo-jsx-'));
      try {
        copyTemplates(makeAnswers({ preset: 'demo', uiFramework }), caseDir, '1.0.0', null);
        const tsconfig = readFileSync(join(caseDir, 'tsconfig.json'), 'utf-8');
        expect(tsconfig, `demo + ${uiFramework}`).toContain(pragma);
        expect(tsconfig.match(/"jsx":/g)?.length ?? 0, `demo + ${uiFramework}`).toBe(1);
        expect(existsSync(join(caseDir, 'src/react-components/sample-react-component.tsx')), `demo + ${uiFramework}`).toBe(hasReactSample);
        expect(existsSync(join(caseDir, 'src/svelte-components/sample-svelte-component.svelte')), `demo + ${uiFramework}`).toBe(true);
      } finally {
        rmSync(caseDir, { force: true, recursive: true });
      }
    }
  });

  it('emits no lint script when no linter is chosen and no preset forces one', () => {
    for (const preset of ['standalone', 'enhanced']) {
      copyTemplates(makeAnswers({ linter: 'none', preset }), targetDir, '1.0.0', null);
      expect(existsSync(join(targetDir, 'scripts/lint.ts')), preset).toBe(false);
    }
  });

  // Jest's emitted suite uses bare `describe`/`it`/`expect`, and an explicit `types` array excludes every
  // @types package it does not name -- so `@types/jest` was installed and then ignored, and every
  // Jest project failed `tsc` with TS2593 on its own sample test.
  it('names the jest types when jest is the test runner, and only then', () => {
    for (const preset of ['standalone', 'enhanced']) {
      copyTemplates(makeAnswers({ preset, testRunner: 'jest' }), targetDir, '1.0.0', null);
      const withJest = JSON.parse(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')) as Record<string, Record<string, unknown>>;
      expect(withJest['compilerOptions']?.['types'], preset).toContain('jest');

      copyTemplates(makeAnswers({ preset, testRunner: 'vitest' }), targetDir, '1.0.0', null);
      const withVitest = JSON.parse(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')) as Record<string, Record<string, unknown>>;
      expect(withVitest['compilerOptions']?.['types'], preset).not.toContain('jest');
    }
  });

  // `src/i18n/index.ts` imports `./locales/en.json`, which TypeScript refuses without this (TS2732).
  it('enables resolveJsonModule for the i18next answer, which imports a JSON locale', () => {
    for (const preset of ['standalone', 'enhanced']) {
      copyTemplates(makeAnswers({ internationalization: 'i18next', preset }), targetDir, '1.0.0', null);
      const config = JSON.parse(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')) as Record<string, Record<string, unknown>>;
      expect(config['compilerOptions']?.['resolveJsonModule'], preset).toBe(true);
    }
  });

  // The ignore entries read `!**/dist/`, which Biome does not treat as excluding the folder -- so once a
  // Build had run, `lint` reported 896 errors in the bundled `dist/build/main.js` and `format` rewrote
  // It. Biome wants a bare `!**/dist`: its own `useBiomeIgnoreFolder` rule rejects the `/**` form too.
  it('excludes build output from biome in the form biome actually honours', () => {
    copyTemplates(makeAnswers({ formatter: 'biome', linter: 'biome' }), targetDir, '1.0.0', null);
    // `.jsonc`, so the config can carry the reasoning for the two rules it turns off. Biome parses its
    // Own config as JSONC whatever the extension; the name is what lets the comments ship.
    const biome = JSON.parse(readFileSync(join(targetDir, 'biome.jsonc'), 'utf-8').replaceAll(/^\s*\/\/.*$/gmu, '')) as Record<string, Record<string, string[]>>;
    const includes = biome['files']?.['includes'] ?? [];
    expect(includes).toContain('!**/dist');
    for (const entry of includes) {
      expect(entry.endsWith('/') || entry.endsWith('/**'), `"${entry}" is a form Biome ignores`).toBe(false);
    }
  });

  it('creates tsconfig.json', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'tsconfig.json'))).toBe(true);
  });

  it('renders EJS templates in package.json scripts', () => {
    copyTemplates(makeAnswers({ linter: 'eslint' }), targetDir, '1.0.0', null);
    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as ParsedPackageJson;
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
    expect(existsSync(join(targetDir, 'biome.jsonc'))).toBe(true);
    const lint = readFileSync(join(targetDir, 'scripts/lint.ts'), 'utf-8');
    expect(lint).toContain('biome lint');
    const lintFix = readFileSync(join(targetDir, 'scripts/lint-fix.ts'), 'utf-8');
    expect(lintFix).toContain('biome lint --write');
  });

  it('renders build script from esbuild partial', () => {
    copyTemplates(makeAnswers({ bundler: 'esbuild' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('esbuild');
    expect(buildScript).toContain('const prod = process.argv[2] !== \'dev\'');
  });

  it('renders build script from rollup partial', () => {
    copyTemplates(makeAnswers({ bundler: 'rollup' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('rollup');
  });

  it('renders build script from vite partial', () => {
    copyTemplates(makeAnswers({ bundler: 'vite' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('vite');
  });

  it('renders build script from webpack partial', () => {
    copyTemplates(makeAnswers({ bundler: 'webpack' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('webpack');
  });

  it('creates webpack config with render sections', () => {
    copyTemplates(makeAnswers({ bundler: 'webpack' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/webpack.config.ts'), 'utf-8');
    expect(config).toContain('ts-loader');
    expect(config).toContain('libraryTarget');
  });

  it('renders build script from parcel partial', () => {
    copyTemplates(makeAnswers({ bundler: 'parcel' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('parcel');
  });

  it('creates dev.ts script', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const devScript = readFileSync(join(targetDir, 'scripts/dev.ts'), 'utf-8');
    expect(devScript).toContain('process.argv[BUILD_MODE_ARGUMENT_INDEX] = \'dev\'');
    expect(devScript).toContain('import(\'./build.ts\')');
  });

  // The defect this guards is silent by construction: both scripts compile, both run a real bundler,
  // And no verification tier executes `dev` -- a watch task does not terminate -- so the two disagreeing
  // About what builds the plugin looked exactly like them agreeing. `build.ts` was keyed on the bundler
  // While `dev.ts` was still keyed on the preset, which left every obsidian-dev-utils preset watching
  // With esbuild whatever was answered, its chosen bundler's config emitted, installed and unread.
  it('dev.ts and build.ts pick the same bundler on every preset', () => {
    const presets = ['demo', 'enhanced', 'standalone'];
    const bundlers = ['esbuild', 'parcel', 'rollup', 'vite', 'webpack'];
    const devUtilsDevImport = 'obsidian-dev-utils/script-utils/bundlers/esbuild';

    for (const preset of presets) {
      for (const bundler of bundlers) {
        const caseDir = join(targetDir, `${preset}-${bundler}`);
        copyTemplates(makeAnswers({ bundler, preset }), caseDir, '1.0.0', null);
        const devScript = readFileSync(join(caseDir, 'scripts/dev.ts'), 'utf-8');
        const label = `${preset} + ${bundler}`;

        if (preset !== 'standalone' && bundler === 'esbuild') {
          // The one path that genuinely differs: obsidian-dev-utils' `dev()` also watches node_modules
          // And re-runs build:compile, which its `build()` cannot do and no CLI bundler offers.
          expect(devScript, label).toContain(`import { dev } from '${devUtilsDevImport}'`);
          expect(devScript, label).toContain('dev({ customEsbuildPlugins })');
          continue;
        }

        // Everywhere else `dev` IS `build` in watch mode, so it re-enters build.ts rather than
        // Restating the bundler -- and must not reach for the esbuild one it was not asked for.
        expect(devScript, label).toContain('process.argv[BUILD_MODE_ARGUMENT_INDEX] = \'dev\'');
        expect(devScript, label).toContain('import(\'./build.ts\')');
        expect(devScript, label).not.toContain(devUtilsDevImport);
      }
    }
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

  it('runs the chosen formatter on every preset, not just standalone', () => {
    // The three tests above all run on the default `standalone` preset, which is why the obsidian-dev-utils
    // Presets could import the dprint runner whatever was chosen -- and install prettier or biome without
    // Ever invoking them, while dprint was not even a dependency.
    const expectedCommands = new Map([
      ['biome', 'biome format'],
      ['dprint', 'dprint'],
      ['prettier', 'prettier']
    ]);

    for (const preset of ['standalone', 'enhanced', 'demo']) {
      for (const [formatter, expectedCommand] of expectedCommands) {
        rmSync(targetDir, { force: true, recursive: true });
        copyTemplates(makeAnswers({ formatter, preset }), targetDir, '1.0.0', null);
        const label = `${preset}/${formatter}`;

        for (const scriptFile of ['scripts/format.ts', 'scripts/format-check.ts']) {
          const script = readFileSync(join(targetDir, scriptFile), 'utf-8');
          expect(script, `${label} ${scriptFile}`).toContain(expectedCommand);
          for (const [otherFormatter, otherCommand] of expectedCommands) {
            if (otherFormatter !== formatter) {
              expect(script, `${label} ${scriptFile} must not run ${otherFormatter}`).not.toContain(otherCommand);
            }
          }
        }
      }
    }
  });

  it('emits dprint.json wherever the dprint runner is what actually runs', () => {
    // Without it the obsidian-dev-utils runner silently falls back to the copy bundled in the library,
    // Which carries none of this project's own excludes -- notably `demo-vault`.
    for (const preset of ['standalone', 'enhanced', 'demo']) {
      rmSync(targetDir, { force: true, recursive: true });
      copyTemplates(makeAnswers({ formatter: 'dprint', preset }), targetDir, '1.0.0', null);
      expect(existsSync(join(targetDir, 'dprint.json')), preset).toBe(true);
    }
  });

  it('formats staged files with biome when biome is the formatter but not the linter', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits', formatter: 'biome', linter: 'eslint' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/nano-staged-config.ts'), 'utf-8');
    expect(config).toContain('biome format --write');
  });

  it('does not stage biome twice when biome is both formatter and linter', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits', formatter: 'biome', linter: 'biome' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/nano-staged-config.ts'), 'utf-8');
    // `biome check --write` already formats.
    expect(config).toContain('biome check --write');
    expect(config).not.toContain('biome format --write');
  });

  it('keeps the two biome options apart when only one of them was chosen', () => {
    // `biome` answers both `linter` and `formatter`, and partial names are one flat namespace, so
    // Choosing it as the formatter used to pull the biome LINTER partials in as well: `scripts/lint.ts`
    // Came out as the eslint script with the biome one concatenated onto it, which does not compile.
    copyTemplates(makeAnswers({ formatter: 'biome', linter: 'eslint' }), targetDir, '1.0.0', null);
    for (const scriptFile of ['scripts/lint.ts', 'scripts/lint-fix.ts']) {
      const script = readFileSync(join(targetDir, scriptFile), 'utf-8');
      expect(script, scriptFile).toContain('eslint');
      expect(script, scriptFile).not.toContain('biome');
    }

    rmSync(targetDir, { force: true, recursive: true });
    copyTemplates(makeAnswers({ formatter: 'prettier', gitHubActions: 'ci', linter: 'biome' }), targetDir, '1.0.0', null);
    const format = readFileSync(join(targetDir, 'scripts/format.ts'), 'utf-8');
    expect(format).toContain('prettier');
    expect(format).not.toContain('biome');
    // The same collision doubled the lint step in the workflow.
    const ci = readFileSync(join(targetDir, '.github/workflows/ci.yml'), 'utf-8');
    expect([...ci.matchAll(/npm run lint$/gm)]).toHaveLength(1);
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

  // Both halves of what makes a generated jest project able to run its tests at all. Without the explicit
  // `rootDir`, ts-jest — which compiles WITH emit despite the tsconfig's `noEmit` — fails every suite with
  // TS5011. Without `useESM` + `extensionsToTreatAsEsm` + the Node flag, jest cannot load the ESM output
  // Ts-jest produces for a `"type": "module"` project. Either half missing means zero tests run, while
  // The exit code stays green.
  it('configures jest to run the emitted ESM suite', () => {
    copyTemplates(makeAnswers({ testRunner: 'jest' }), targetDir, '1.0.0', null);
    const jestConfig = readFileSync(join(targetDir, 'jest.config.ts'), 'utf-8');
    expect(jestConfig).toContain('extensionsToTreatAsEsm');
    expect(jestConfig).toContain('rootDir: \'.\'');
    expect(jestConfig).toContain('useESM: true');
    // The explicit transform replaced `preset: 'ts-jest'`, which had nowhere to carry the options above.
    // Matched as a top-level key, not as a substring: the comment explaining the swap says
    // `preset: 'ts-jest'` verbatim.
    expect(jestConfig).toMatch(/^ {2}transform: \{$/mu);
    expect(jestConfig).not.toMatch(/^ {2}preset:/mu);

    for (const scriptName of ['scripts/test.ts', 'scripts/test-watch.ts']) {
      const script = readFileSync(join(targetDir, scriptName), 'utf-8');
      expect(script, scriptName).toContain('--experimental-vm-modules');
    }
  });

  // The `obsidian` npm package is types-only -- `"main": ""` and a tarball of `.d.ts` files -- so nothing
  // Resolves it at runtime. All three pieces are load-bearing for jest: the mapper (there is no module for
  // A `jest.mock('obsidian')` to stand in for), the setup files (the prototype extensions and globals
  // Obsidian installs), and jsdom (that setup writes to `Document`, `Element` and `window`). Miss one and
  // The sample test cannot even load the plugin it is testing.
  it('points jest at the obsidian mocks', () => {
    for (const preset of ['standalone', 'enhanced', 'demo']) {
      copyTemplates(makeAnswers({ preset, testRunner: 'jest' }), targetDir, '1.0.0', null);
      const jestConfig = readFileSync(join(targetDir, 'jest.config.ts'), 'utf-8');
      expect(jestConfig, preset).toContain('\'^obsidian$\': \'obsidian-test-mocks/obsidian\'');
      expect(jestConfig, preset).toContain('obsidian-test-mocks/jest-setup');
      expect(jestConfig, preset).toContain('testEnvironment: \'jsdom\'');
    }
  });

  // The dev-utils presets get their alias from `defineObsidianPluginVitestConfig`; standalone has no such
  // Config, so it declares both halves itself. Both ARE needed: `vitest-setup` only calls
  // `vi.mock('obsidian')`, and vite has to resolve the specifier before that mock is ever consulted.
  it('points the standalone vitest config at the obsidian mocks', () => {
    copyTemplates(makeAnswers({ preset: 'standalone', testRunner: 'vitest' }), targetDir, '1.0.0', null);
    const vitestConfig = readFileSync(join(targetDir, 'vitest.config.ts'), 'utf-8');
    // The array form, anchored: the config also carries RegExp aliases for `.wasm`, and vite takes one
    // Alias form or the other for the whole list.
    expect(vitestConfig).toContain('{ find: /^obsidian$/u, replacement: \'obsidian-test-mocks/obsidian\' }');
    expect(vitestConfig).toContain('obsidian-test-mocks/vitest-setup');
    expect(vitestConfig).toContain('environment: \'jsdom\'');
  });

  // Compiling a single-file component needs a plugin that is a dependency only of the chosen bundler, so
  // Both runners alias `.svelte` / `.vue` to a stub instead. Not optional on `preset: demo`, whose
  // `plugin.ts` imports the svelte view unconditionally -- without the stub it cannot be imported at all.
  it('stubs single-file components for both runners', () => {
    for (const testRunner of ['jest', 'vitest']) {
      copyTemplates(makeAnswers({ preset: 'demo', testRunner }), targetDir, '1.0.0', null);
      const stub = readFileSync(join(targetDir, 'scripts/framework-component-stub.ts'), 'utf-8');
      expect(stub, testRunner).toContain('export default function frameworkComponentStub');
      const configPath = testRunner === 'jest' ? 'jest.config.ts' : 'scripts/vitest-config.ts';
      expect(readFileSync(join(targetDir, configPath), 'utf-8'), testRunner).toContain('framework-component-stub.ts');
    }

    // Jest needs the whole `svelte` package stubbed as well, not only the component: svelte reaches its
    // Own runtime through Node subpath imports and jest's ESM resolver hands back the types entry for
    // Those, so every suite that loads it dies on a missing `COMMENT_NODE` export. Vitest resolves them.
    copyTemplates(makeAnswers({ preset: 'demo', testRunner: 'jest' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'jest.config.ts'), 'utf-8')).toContain('\'^svelte$\'');
  });

  // Solid compiles its JSX with `babel-preset-solid`, so its `tsconfig.json` says `jsx: 'preserve'` --
  // Which neither unit runner can consume. ts-jest emits the JSX untouched ("Unexpected token '<'") and
  // Vite refuses to parse it at all. Both get the automatic runtime from `solid-js/h`, the entry point
  // That publishes a `jsx-runtime`; plain `solid-js` does not.
  it('gives both runners a JSX runtime for the solid answer, and only for it', () => {
    copyTemplates(makeAnswers({ preset: 'enhanced', testRunner: 'jest', uiFramework: 'solid' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'jest.config.ts'), 'utf-8')).toContain('jsxImportSource: \'solid-js/h\'');

    copyTemplates(makeAnswers({ preset: 'enhanced', testRunner: 'vitest', uiFramework: 'solid' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'scripts/vitest-config.ts'), 'utf-8')).toContain('importSource: \'solid-js/h\'');

    copyTemplates(makeAnswers({ preset: 'standalone', testRunner: 'vitest', uiFramework: 'solid' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'vitest.config.ts'), 'utf-8')).toContain('importSource: \'solid-js/h\'');

    // Wrong for every other framework's runtime, so it must not leak into them.
    copyTemplates(makeAnswers({ preset: 'enhanced', testRunner: 'jest', uiFramework: 'react' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'jest.config.ts'), 'utf-8')).not.toContain('solid-js');
  });

  // The point of the whole exercise. A sample test that imports nothing passes on every combination while
  // Proving nothing, which is what hid the missing `obsidian` runtime for as long as it did. Importing the
  // Plugin under test is what gives the gate tier's non-zero collected-test count something to mean.
  it('emits a sample test that imports the plugin under test', () => {
    for (const preset of ['standalone', 'enhanced', 'demo']) {
      for (const testRunner of ['jest', 'vitest']) {
        copyTemplates(makeAnswers({ preset, testRunner }), targetDir, '1.0.0', null);
        const sample = readFileSync(join(targetDir, 'src/plugin.test.ts'), 'utf-8');
        const label = `${preset} + ${testRunner}`;
        expect(sample, label).toContain('from \'./plugin.ts\'');
        expect(sample, label).toContain('from \'obsidian\'');
      }
    }
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

  it('includes .hotreload write in build script when hot-reload-plugin is selected', () => {
    copyTemplates(makeAnswers({ hotReload: 'hot-reload-plugin' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('.hotreload');
  });

  it('includes obsidian plugin:reload in build script when obsidian-cli is selected', () => {
    copyTemplates(makeAnswers({ hotReload: 'obsidian-cli' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).toContain('obsidian plugin:reload');
  });

  it('excludes reload from build script when hot reload is none', () => {
    copyTemplates(makeAnswers({ hotReload: 'none' }), targetDir, '1.0.0', null);
    const buildScript = readFileSync(join(targetDir, 'scripts/build.ts'), 'utf-8');
    expect(buildScript).not.toContain('.hotreload');
    expect(buildScript).not.toContain('plugin:reload');
  });

  it('creates ci.yml with eslint step when eslint is selected', () => {
    copyTemplates(makeAnswers({ gitHubActions: 'ci', linter: 'eslint' }), targetDir, '1.0.0', null);
    const ci = readFileSync(join(targetDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('npm run lint');
  });

  it('creates ci.yml with biome step when biome linter is selected', () => {
    copyTemplates(makeAnswers({ gitHubActions: 'ci', linter: 'biome' }), targetDir, '1.0.0', null);
    const ci = readFileSync(join(targetDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('npm run lint');
  });

  it('creates ci.yml with vitest step when vitest is selected', () => {
    copyTemplates(makeAnswers({ gitHubActions: 'ci', testRunner: 'vitest' }), targetDir, '1.0.0', null);
    const ci = readFileSync(join(targetDir, '.github/workflows/ci.yml'), 'utf-8');
    expect(ci).toContain('npm test');
  });

  it('creates release.yml for ci-and-release', () => {
    copyTemplates(makeAnswers({ gitHubActions: 'ci-and-release' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, '.github/workflows/release.yml'))).toBe(true);
  });

  it('creates commitlint config for conventional-commits', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/commitlint-config.ts'), 'utf-8');
    expect(config).toContain('@commitlint/config-conventional');
  });

  it('creates nano-staged config with eslint command', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits', linter: 'eslint' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/nano-staged-config.ts'), 'utf-8');
    expect(config).toContain('eslint --fix');
  });

  it('creates nano-staged config with prettier command', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits', formatter: 'prettier' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/nano-staged-config.ts'), 'utf-8');
    expect(config).toContain('prettier --write');
  });

  // All three were registered, but reading any `_` in a basename as the partial marker made the render loop
  // Skip `bug_report.yml` and `feature_request.yml` and write only `config.yml` --
  // Leaving every project that asked for issue templates pointing at forms that did not exist.
  it('creates all three issue template files, not just the one without an underscore', () => {
    copyTemplates(makeAnswers({ gitHubIssueTemplates: 'bug-and-feature' }), targetDir, '1.0.0', null);
    for (const name of ['bug_report.yml', 'config.yml', 'feature_request.yml']) {
      const path = join(targetDir, '.github/ISSUE_TEMPLATE', name);
      expect(existsSync(path), `${name} should be created`).toBe(true);
      expect(readFileSync(path, 'utf-8').trim(), `${name} should not be empty`).not.toBe('');
    }
  });

  it('does not create issue template files when gitHubIssueTemplates is none', () => {
    copyTemplates(makeAnswers({ gitHubIssueTemplates: 'none' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, '.github/ISSUE_TEMPLATE'))).toBe(false);
  });

  it('does not create workflow files when gitHubActions is none', () => {
    copyTemplates(makeAnswers({ gitHubActions: 'none' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, '.github/workflows/ci.yml'))).toBe(false);
    expect(existsSync(join(targetDir, '.github/workflows/release.yml'))).toBe(false);
  });

  // Typed ESLint rules need every file ESLint reaches to be in the tsconfig `include`, and `e2e/` was in
  // Neither list while the plugin config still linted it -- so every project with an e2e runner and
  // ESLint died on "You have used a rule which requires type information", the largest single class of
  // Install-tier failures. The two lists have to agree; that is what these assert.
  it('puts e2e in the tsconfig include and the ESLint file list on the standalone preset', () => {
    copyTemplates(makeAnswers({ e2eTestRunner: 'wdio-obsidian', linter: 'eslint', preset: 'standalone' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')).toContain('e2e/**/*.ts');
    expect(readFileSync(join(targetDir, 'eslint.config.mts'), 'utf-8')).toContain('e2e/**/*.ts');
  });

  // On a dev-utils preset the ESLint file list lives in `scripts/eslint-config.ts`, which the root
  // `eslint.config.mts` re-exports -- so that is where the `e2e/` entry has to appear.
  it('puts e2e in the tsconfig include and the ESLint file list on the enhanced preset', () => {
    copyTemplates(makeAnswers({ e2eTestRunner: 'wdio-obsidian', linter: 'eslint', preset: 'enhanced' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')).toContain('e2e/**/*.ts');
    expect(readFileSync(join(targetDir, 'scripts/eslint-config.ts'), 'utf-8')).toContain('e2e/**/*.ts');
  });

  it('names neither list an e2e directory that was not emitted', () => {
    copyTemplates(makeAnswers({ e2eTestRunner: 'none', linter: 'eslint', preset: 'standalone' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'e2e'))).toBe(false);
    // The entry, not the substring: both templates carry a comment naming `e2e/` and explaining why the
    // Two lists must agree.
    expect(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')).not.toContain('"./e2e/**/*.ts"');
    expect(readFileSync(join(targetDir, 'eslint.config.mts'), 'utf-8')).not.toContain('\'e2e/**/*.ts\'');
  });

  it('names neither list an e2e directory that was not emitted, on the enhanced preset', () => {
    copyTemplates(makeAnswers({ e2eTestRunner: 'none', linter: 'eslint', preset: 'enhanced' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'e2e'))).toBe(false);
    expect(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')).not.toContain('"./e2e/**/*.ts"');
    expect(readFileSync(join(targetDir, 'scripts/eslint-config.ts'), 'utf-8')).not.toContain('\'e2e/**/*.ts\'');
  });

  // The repo's own "root configs are thin wrappers" decision, which the emitted `eslint.config.mts` was
  // The one violation of until the dev-utils presets adopted the shared config.
  it('emits a thin root eslint config on a dev-utils preset and an inlined one on standalone', () => {
    copyTemplates(makeAnswers({ linter: 'eslint', preset: 'enhanced' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'eslint.config.mts'), 'utf-8').trim()).toBe('export { configs as default } from \'./scripts/eslint-config.ts\';');
    expect(readFileSync(join(targetDir, 'scripts/eslint-config.ts'), 'utf-8')).toContain('defineEslintConfigs');
  });

  it('spreads the shared markdownlint config on a dev-utils preset and inlines one on standalone', () => {
    copyTemplates(makeAnswers({ markdownLinter: 'markdownlint', preset: 'enhanced' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'scripts/markdownlint-cli2-config.ts'), 'utf-8')).toContain('...obsidianDevUtilsConfig');
    rmSync(targetDir, { force: true, recursive: true });
    copyTemplates(makeAnswers({ markdownLinter: 'markdownlint', preset: 'standalone' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/markdownlint-cli2-config.ts'), 'utf-8');
    expect(config).toContain('from \'markdownlint-rule-relative-links\'');
    expect(config).not.toContain('obsidian-dev-utils');
  });

  it('inlines the whole config on the standalone preset, which depends on nothing from the ecosystem', () => {
    copyTemplates(makeAnswers({ linter: 'eslint', preset: 'standalone' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, 'scripts/eslint-config.ts'))).toBe(false);
    const config = readFileSync(join(targetDir, 'eslint.config.mts'), 'utf-8');
    expect(config).toContain('from \'typescript-eslint\'');
    expect(config).not.toContain('from \'obsidian-dev-utils');
  });

  // The per-plugin brands are the whole of what a real plugin's wrapper overrides, so they have to
  // Survive the move into `scripts/eslint-config.ts`.
  it('carries the sentence-case brands into the shared-config wrapper', () => {
    copyTemplates(makeAnswers({ linter: 'eslint', pluginName: 'My Awesome Plugin', preset: 'enhanced' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'scripts/eslint-config.ts'), 'utf-8')).toContain('\'My Awesome Plugin\'');
  });

  // `WebdriverIO.Config` requires `capabilities`, and the namespace itself only reaches the program
  // Through these type packages -- TS2741 and TS2503, on every case carrying this answer.
  it('emits a wdio config that satisfies its own type', () => {
    copyTemplates(makeAnswers({ e2eTestRunner: 'wdio-obsidian' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'wdio.conf.ts'), 'utf-8')).toContain('capabilities:');
    expect(readFileSync(join(targetDir, 'tsconfig.json'), 'utf-8')).toContain('@wdio/globals/types');
  });

  // Vitest's default glob otherwise sweeps up `e2e/`, and `npm test` reports the end-to-end suite as
  // Failed unit tests. The dev-utils presets escape it through their per-project `include`, jest through
  // `roots`; this config had neither.
  it('restricts the standalone vitest config to src, so the e2e suite is not collected', () => {
    copyTemplates(makeAnswers({ e2eTestRunner: 'wdio-obsidian', preset: 'standalone', testRunner: 'vitest' }), targetDir, '1.0.0', null);
    expect(readFileSync(join(targetDir, 'vitest.config.ts'), 'utf-8')).toContain('include: [\'src/**/*.test.ts\']');
  });

  it('emits a .depcheckrc.json whose ignores and reasons agree', () => {
    copyTemplates(
      makeAnswers({ bundler: 'webpack', commitLinting: 'conventional-commits', styling: 'scss', uiFramework: 'svelte' }),
      targetDir,
      '1.0.0',
      null
    );
    const config = JSON.parse(readFileSync(join(targetDir, '.depcheckrc.json'), 'utf-8')) as ParsedDepcheckRc;
    expect(config.ignores).toEqual(expect.arrayContaining(['czg', 'sass-loader', 'svelte-check', 'svelte-loader', 'typescript']));
    // One reason line per entry, in the same order, so no entry lands without the reference proving it.
    const reasonNames = config.comment.slice(config.comment.indexOf('') + 1).map((line) => line.split(' - ')[0]);
    expect(reasonNames).toEqual(config.ignores);
  });

  it('writes generator config file', () => {
    const config = copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    expect(config.generatorVersion).toBe('1.0.0');
    expect(Object.keys(config.fileHashes).length).toBeGreaterThan(0);
  });
});

describe('isPartialTemplatePath', () => {
  it.each([
    'manifest.json_has-funding.ejs',
    'scripts/build.ts_standalone@bundler_esbuild.ejs',
    'src/main.ts@import_scss.ejs',
    '.github/ISSUE_TEMPLATE/bug_report.yml_has-funding.ejs'
  ])('reads %s as a partial', (path) => {
    expect(isPartialTemplatePath(path)).toBe(true);
  });

  // The real plugins' own names: a `_` whose tail is not a partial name is part of the filename.
  it.each([
    '.github/ISSUE_TEMPLATE/bug_report.yml.ejs',
    '.github/ISSUE_TEMPLATE/feature_request.yml.ejs',
    'manifest.json.ejs',
    'scripts_dir/build.ts.ejs',
    '_leading.ejs'
  ])('reads %s as a template of its own', (path) => {
    expect(isPartialTemplatePath(path)).toBe(false);
  });

  // Every partial actually on disk must still classify as one, or it would be emitted as a file of its
  // Own named after the partial; the plan tier's inventory reads the same function.
  it('still classifies every on-disk partial the old any-underscore rule did, except the two real filenames', () => {
    const templatesDir = join(getScriptDir(), '..', 'templates', 'default');
    function walk(dir: string): string[] {
      return readdirSync(join(templatesDir, dir), { withFileTypes: true }).flatMap((entry) => {
        const relativePath = dir === '' ? entry.name : `${dir}/${entry.name}`;
        return entry.isDirectory() ? walk(relativePath) : [relativePath];
      });
    }
    const changed = walk('')
      .filter((path) => path.endsWith('.ejs'))
      .filter((path) => (path.split('/').pop() ?? '').includes('_') !== isPartialTemplatePath(path));
    expect(changed.sort()).toEqual(['.github/ISSUE_TEMPLATE/bug_report.yml.ejs', '.github/ISSUE_TEMPLATE/feature_request.yml.ejs']);
  });
});

describe('sortImportStatements', () => {
  // The directive has to stay on the import it was written for. A split on the newline before `import `
  // Also fired between the comment and its import, so the comment was sorted as a block of its own and
  // Landed above whichever import followed -- an unused directive there, and a live violation here.
  it('keeps a comment line with the import directly below it', () => {
    const text = [
      'import typescriptModule from \'@rollup/plugin-typescript\';',
      'import { builtinModules } from \'node:module\';',
      '// eslint-disable-next-line import-x/no-rename-default -- reason',
      'import wasmModule from \'@rollup/plugin-wasm\';',
      ''
    ].join('\n');

    expect(sortImportStatements(text)).toBe([
      'import typescriptModule from \'@rollup/plugin-typescript\';',
      '// eslint-disable-next-line import-x/no-rename-default -- reason',
      'import wasmModule from \'@rollup/plugin-wasm\';',
      'import { builtinModules } from \'node:module\';',
      ''
    ].join('\n'));
  });

  it('keeps a multi-line import together', () => {
    const text = [
      'import { z } from \'z\';',
      'import {',
      '  a,',
      '  b',
      '} from \'a\';',
      ''
    ].join('\n');

    expect(sortImportStatements(text)).toBe([
      'import {',
      '  a,',
      '  b',
      '} from \'a\';',
      'import { z } from \'z\';',
      ''
    ].join('\n'));
  });
});
