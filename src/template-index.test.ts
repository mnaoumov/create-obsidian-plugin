import {
  mkdirSync,
  mkdtempSync,
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

import {
  getLogicalTemplatePath,
  indexTemplateDir
} from './template-index.ts';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cop-template-index-'));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

function writeTemplates(paths: readonly string[]): void {
  for (const path of paths) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), '');
  }
}

describe('getLogicalTemplatePath', () => {
  it('drops every group folder, at any depth, and keeps every other folder', () => {
    expect(getLogicalTemplatePath('scripts/(build)/(esbuild)/build.ts@bundler_esbuild.ejs')).toBe('scripts/build.ts@bundler_esbuild.ejs');
    expect(getLogicalTemplatePath('(tsconfig)/tsconfig.json_framework.ejs')).toBe('tsconfig.json_framework.ejs');
    expect(getLogicalTemplatePath('src/wasm/answer.ts_wasm-vite.ejs')).toBe('src/wasm/answer.ts_wasm-vite.ejs');
  });

  it('reads a folder as a group only when its whole name is in parentheses', () => {
    expect(getLogicalTemplatePath('src/(a)b/file.ts.ejs')).toBe('src/(a)b/file.ts.ejs');
  });
});

describe('indexTemplateDir', () => {
  it('maps each logical path to the file on disk', () => {
    writeTemplates(['scripts/(build)/build.ts.ejs', 'scripts/gate.ts.ejs']);
    expect([...indexTemplateDir(root)].sort()).toEqual([
      ['scripts/build.ts.ejs', 'scripts/(build)/build.ts.ejs'],
      ['scripts/gate.ts.ejs', 'scripts/gate.ts.ejs']
    ]);
  });

  it('refuses two files that resolve to one logical path', () => {
    writeTemplates(['scripts/(build)/build.ts.ejs', 'scripts/(dev)/build.ts.ejs']);
    expect(() => indexTemplateDir(root)).toThrow(/resolve to scripts\/build\.ts\.ejs/);
  });

  it('returns an empty index for a root that does not exist', () => {
    expect(indexTemplateDir(join(root, 'missing')).size).toBe(0);
  });
});
