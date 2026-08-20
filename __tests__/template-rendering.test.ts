import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync
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

import type { Answers } from '../src/answers.ts';

import { copyTemplates } from '../src/templates.ts';

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
    currentYear: CURRENT_YEAR,
    e2eTestRunner: 'none',
    editorExtensions: 'none',
    formatter: 'none',
    fundingUrl: '',
    gitHubActions: 'none',
    gitHubFunding: 'funding-yml',
    gitHubIssueTemplates: 'bug-and-feature',
    hotReload: 'hot-reload-plugin',
    internationalization: 'none',
    linter: 'none',
    markdownLinter: 'none',
    obsidianConfigFolder: '',
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

  it('leads the README with the plugin description', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    // G102 puts a lead paragraph between the title block and the first section.
    expect(readme.split('## Installation')[0]).toContain('A test plugin.');
  });

  it('orders the README sections per the G102 skeleton', () => {
    copyTemplates(makeAnswers({ fundingUrl: 'https://example.com/sponsor', preset: 'enhanced' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    const sections = [...readme.matchAll(/^## (?<Title>.+)$/gm)].map((match) => match.groups?.['Title']);
    // G102 puts `Demo vault` first, before any feature section.
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
      // All three G102 access routes, plus the plain-markdown entry point.
      expect(readme, preset).toContain('[Start reading here](<./demo-vault/00 Start.md>)');
      expect(readme, preset).toContain('**My Plugin: Open demo vault** command');
      expect(readme, preset).toContain('`my-plugin-demo-vault-<version>.zip`');
      expect(readme, preset).toContain('[`demo-vault/`](./demo-vault/README.md)');
    }
  });

  it('omits the Demo vault section and the vault for the standalone preset', () => {
    copyTemplates(makeAnswers({ preset: 'standalone' }), targetDir, '1.0.0', null);
    const readme = readFileSync(join(targetDir, 'README.md'), 'utf-8');
    // `standalone` has no obsidian-dev-utils release flow, so nothing would archive the vault into a
    // Release -- and G102 omits a section rather than linking a file that does not exist.
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
    expect(demoSetup).toContain('const PLUGIN_ID = \'my-plugin\';');

    const startupScript = readFileSync(join(targetDir, 'demo-vault/_assets/CodeScriptToolkit/startup.ts'), 'utf-8');
    // A top-level script throws `this.startupScript.invoke is not a function` when the vault loads.
    expect(startupScript).toContain('export async function invoke(');
  });

  it('commits both plugin ids and none of the injected app.json settings in the demo vault', () => {
    copyTemplates(makeAnswers({ preset: 'enhanced' }), targetDir, '1.0.0', null);

    const communityPlugins = JSON.parse(readFileSync(join(targetDir, 'demo-vault/.obsidian/community-plugins.json'), 'utf-8')) as string[];
    // Listing only the helper is a silent failure: it enables CodeScript Toolkit, not the plugin itself.
    expect(communityPlugins).toStrictEqual(['demo-vault-helper', 'my-plugin']);

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
    for (const relativePath of ['src/Plugin.ts', 'src/PluginSettings.ts', 'src/PluginSettingsComponent.ts', 'src/PluginSettingsTab.ts']) {
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
    expect(existsSync(join(targetDir, 'biome.json'))).toBe(true);
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
    const config = readFileSync(join(targetDir, 'scripts/commitlint.config.ts'), 'utf-8');
    expect(config).toContain('@commitlint/config-conventional');
  });

  it('creates lint-staged config with eslint command', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits', linter: 'eslint' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/lintstagedrc.ts'), 'utf-8');
    expect(config).toContain('eslint --fix');
  });

  it('creates lint-staged config with prettier command', () => {
    copyTemplates(makeAnswers({ commitLinting: 'conventional-commits', formatter: 'prettier' }), targetDir, '1.0.0', null);
    const config = readFileSync(join(targetDir, 'scripts/lintstagedrc.ts'), 'utf-8');
    expect(config).toContain('prettier --write');
  });

  it('does not create workflow files when gitHubActions is none', () => {
    copyTemplates(makeAnswers({ gitHubActions: 'none' }), targetDir, '1.0.0', null);
    expect(existsSync(join(targetDir, '.github/workflows/ci.yml'))).toBe(false);
    expect(existsSync(join(targetDir, '.github/workflows/release.yml'))).toBe(false);
  });

  it('writes generator config file', () => {
    const config = copyTemplates(makeAnswers(), targetDir, '1.0.0', null);
    expect(config.generatorVersion).toBe('1.0.0');
    expect(Object.keys(config.fileHashes).length).toBeGreaterThan(0);
  });

  it('does not produce empty files', () => {
    copyTemplates(makeAnswers(), targetDir, '1.0.0', null);

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
