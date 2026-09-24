import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  dirname,
  join
} from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import type { GeneratorConfig } from './answers.ts';

import { makeAnswers } from './answer-space.ts';
import {
  loadOverlay,
  toRecordedOverlayPath
} from './overlay.ts';
import { loadTemplateInventory } from './plan-checks.ts';
import {
  buildTemplate,
  copyTemplates
} from './templates.ts';

/** The README's third line, which holds every badge. */
const BADGE_LINE_INDEX = 2;

/** Read once: every `loadOverlay` would otherwise walk all of `templates/default` again. */
const BUILT_IN = loadTemplateInventory();

let root: string;
let overlayDir: string;
let targetDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cop-overlay-'));
  overlayDir = join(root, 'my-template');
  targetDir = join(root, 'obsidian-test');
  mkdirSync(overlayDir);
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

function readEmitted(path: string): string {
  return readFileSync(join(targetDir, path), 'utf-8');
}

function writeOverlay(files: Record<string, string>, manifest: Record<string, unknown> = {}): void {
  writeFileSync(join(overlayDir, 'overlay.json'), JSON.stringify(manifest));
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(overlayDir, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

describe('loadOverlay', () => {
  it('accepts a section partial, a new file, a whole-file override and a built-in partial override', () => {
    writeOverlay({
      '.github/FUNDING.yml.ejs': 'custom: https://example.com\n',
      'docs/NOTES.md.ejs': '# Notes for <%= pluginName %>\n',
      'manifest.json@platform_desktop-only.ejs': '  "isDesktopOnly": true\n',
      'README.md': 'The overlay documents itself here.\n',
      'README.md@support_mine.ejs': '\n## Mine\n'
    }, { files: ['docs/NOTES.md'], packages: ['type-fest'], partials: ['mine'] });

    expect(loadOverlay(overlayDir, BUILT_IN)).toEqual({
      badges: [],
      dir: overlayDir,
      files: ['docs/NOTES.md'],
      packages: ['type-fest'],
      partials: ['mine']
    });
  });

  it.each([
    ['no directory', null, {}, /not found/],
    ['no manifest', {}, null, /has no overlay\.json/],
    ['an unknown manifest key', {}, { partial: [] }, /unknown key "partial"/],
    ['a manifest list that is not strings', {}, { packages: [1] }, /"packages" .* array of strings/],
    ['a partial name that is not kebab-case', { 'README.md@support_My.ejs': 'x' }, { partials: ['My'] }, /not kebab-case/],
    ['a built-in partial name', { 'README.md@support_esbuild.ejs': 'x' }, { partials: ['esbuild'] }, /already a built-in partial name/],
    ['a declared partial with no file', {}, { partials: ['mine'] }, /no file in the overlay contributes it/],
    ['a partial file nobody declared', { 'README.md@support_mine.ejs': 'x' }, {}, /neither declared in "partials"/],
    ['a section no template renders', { 'README.md@badges_mine.ejs': 'x' }, { partials: ['mine'] }, /no template makes that call/],
    ['a whole-file partial of an unknown file', { 'notes.md_mine.ejs': 'x' }, { partials: ['mine'] }, /neither a built-in file nor listed/],
    ['a new file not listed in files', { 'docs/NOTES.md.ejs': 'x' }, {}, /overrides no built-in file/],
    ['a listed file with no template', {}, { files: ['docs/NOTES.md'] }, /no docs\/NOTES\.md\.ejs/],
    ['a listed file that is built in', { 'LICENSE.ejs': 'x' }, { files: ['LICENSE'] }, /is a built-in file/],
    ['a listed file named with .ejs', { 'docs/NOTES.md.ejs': 'x' }, { files: ['docs/NOTES.md.ejs'] }, /names a template/],
    ['a stray non-template file', { '.github/FUNDING.yml': 'x' }, {}, /would be ignored/],
    ['a badge spanning two lines', {}, { badges: ['[a](b)\n[c](d)'] }, /must be one non-empty line/],
    ['a package name with a version', {}, { packages: ['type-fest@4'] }, /not a valid npm package name/]
  ])('refuses %s', (_label, files, manifest, message) => {
    if (files === null) {
      rmSync(overlayDir, { force: true, recursive: true });
    } else if (manifest !== null) {
      writeOverlay(files, manifest);
    }
    expect(() => loadOverlay(overlayDir, BUILT_IN)).toThrow(message);
  });
});

describe('an overlay applied by copyTemplates', () => {
  it('registers its packages, badges, files and partials after the built-in ones', () => {
    writeOverlay({
      'docs/NOTES.md.ejs': '# Notes\n',
      'README.md@support_mine.ejs': '\n## Mine\n'
    }, { badges: ['[![Mine](https://example.com/badge.svg)](https://example.com)'], files: ['docs/NOTES.md'], packages: ['type-fest'], partials: ['mine'] });
    const overlay = loadOverlay(overlayDir, BUILT_IN);

    const builder = buildTemplate(makeAnswers(), overlay);
    expect(builder.dependencies.map((dependency) => dependency.packageName)).toContain('type-fest');
    expect(builder.badges.at(-1)).toBe(overlay.badges[0]);
    expect([...builder.partials].at(-1)).toBe('mine');
    expect(builder.templateFiles).toContain('docs/NOTES.md');
  });

  it('emits the overlay\'s templates ahead of the built-in ones, and leaves the rest alone', () => {
    writeOverlay({
      'docs/NOTES.md.ejs': '# Notes for <%= pluginName %>\n',
      'LICENSE.ejs': 'All rights reserved by <%= authorName %>.\n',
      'README.md@support_mine.ejs': '\n## Mine\n'
    }, { badges: ['[![Mine](https://example.com/badge.svg)](https://example.com)'], files: ['docs/NOTES.md'], packages: ['type-fest'], partials: ['mine'] });
    const answers = makeAnswers();

    copyTemplates(answers, targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN));

    expect(readEmitted('docs/NOTES.md')).toBe(`# Notes for ${answers.pluginName}\n`);
    expect(readEmitted('LICENSE')).toBe(`All rights reserved by ${answers.authorName}.\n`);
    const readme = readEmitted('README.md');
    expect(readme).toContain('\n## Mine\n');
    // The badge line stays one line, with the overlay's badge last on it.
    expect(readme.split('\n')[BADGE_LINE_INDEX]).toMatch(/\[!\[Mine\]\(https:\/\/example\.com\/badge\.svg\)\]\(https:\/\/example\.com\)$/);
    expect(readEmitted('package.json')).toContain('"type-fest"');
    expect(readEmitted('manifest.json')).toContain(answers.pluginId);
  });

  it('overrides a built-in partial file by path without declaring anything', () => {
    writeOverlay({ 'README.md@support_has-funding.ejs': '\n## Support me elsewhere\n' });
    copyTemplates(makeAnswers({ fundingPlatform: 'custom', fundingUrl: 'https://example.com' }), targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN));
    expect(readEmitted('README.md')).toContain('## Support me elsewhere');
  });

  it('does not emit an override whose built-in the answers do not register', () => {
    writeOverlay({ 'vite.config.ts.ejs': 'export default {};\n' });
    const config = copyTemplates(makeAnswers({ bundler: 'esbuild' }), targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN));
    expect(Object.keys(config.fileHashes)).not.toContain('vite.config.ts');
  });

  it('refuses an overlay template that is not valid EJS instead of emitting its source', () => {
    writeOverlay({ 'LICENSE.ejs': '<%= notAnAnswer %>\n' });
    expect(() => copyTemplates(makeAnswers(), targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN))).toThrow(/LICENSE\.ejs failed to render/);
  });

  // The reason the overlay is recorded beside the answers: the updater compares each file with the hash it
  // Recorded, so what decides whether a file is rewritten is what was generated LAST time.
  describe('on update', () => {
    function update(existing: GeneratorConfig, withOverlay: boolean): GeneratorConfig {
      return copyTemplates(makeAnswers(), targetDir, '1.0.1', existing, new Map(), undefined, withOverlay ? loadOverlay(overlayDir, BUILT_IN) : null);
    }

    beforeEach(() => {
      writeOverlay({ 'LICENSE.ejs': 'Mine.\n' });
    });

    it('keeps an overlaid file when the overlay is re-applied', () => {
      const first = copyTemplates(makeAnswers(), targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN));
      update(first, true);
      expect(readEmitted('LICENSE')).toBe('Mine.\n');
    });

    it('updates an overlaid file cleanly when the overlay itself changes', () => {
      const first = copyTemplates(makeAnswers(), targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN));
      writeFileSync(join(overlayDir, 'LICENSE.ejs'), 'Mine, revised.\n');
      update(first, true);
      expect(readEmitted('LICENSE')).toBe('Mine, revised.\n');
    });

    it('reverts every overlaid file when the overlay is dropped, which is why it is recorded', () => {
      const first = copyTemplates(makeAnswers(), targetDir, '1.0.0', null, new Map(), undefined, loadOverlay(overlayDir, BUILT_IN));
      update(first, false);
      expect(readEmitted('LICENSE')).not.toBe('Mine.\n');
    });
  });
});

describe('toRecordedOverlayPath', () => {
  it('records the overlay relative to the project, with forward slashes', () => {
    expect(toRecordedOverlayPath(join(root, 'templates', 'mine'), targetDir)).toBe('../templates/mine');
  });
});
