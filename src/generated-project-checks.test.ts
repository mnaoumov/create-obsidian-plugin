import {
  describe,
  expect,
  it
} from 'vitest';

import {
  findUnbundledRequires,
  findUnshippedFiles,
  readCollectedTestCount
} from './generated-project-checks.ts';

describe('readCollectedTestCount', () => {
  const VITEST_PASSED = 3;
  const JEST_PASSED = 2;
  const PASSED_AFTER_ANOTHER_COUNT = 4;

  it('reads the count from vitest 5 output colored by the terminal', () => {
    const output = [
      ' \u001b[1m\u001b[46m RUN \u001b[49m\u001b[22m \u001b[36mv5.0.1 \u001b[39m\u001b[90mF:/tmp/cg/c-Vn7l4a\u001b[39m',
      '\u001b[2m Test Files \u001b[22m \u001b[1m\u001b[32m1 passed\u001b[39m\u001b[22m\u001b[90m (1)\u001b[39m',
      `\u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m${String(VITEST_PASSED)} passed\u001b[39m\u001b[22m\u001b[90m (3)\u001b[39m`
    ].join('\n');
    expect(readCollectedTestCount(output)).toBe(VITEST_PASSED);
  });

  it('reads the count from jest output colored by the terminal', () => {
    const output = [
      '\u001b[1mTest Suites: \u001b[22m\u001b[1m\u001b[32m1 passed\u001b[39m\u001b[22m, 1 total',
      `\u001b[1mTests:       \u001b[22m\u001b[1m\u001b[32m${String(JEST_PASSED)} passed\u001b[39m\u001b[22m, 2 total`
    ].join('\n');
    expect(readCollectedTestCount(output)).toBe(JEST_PASSED);
  });

  it('reads the count from uncolored output of both runners', () => {
    expect(readCollectedTestCount(' Test Files  1 passed (1)\n      Tests  1 passed (1)\n')).toBe(1);
    expect(readCollectedTestCount('Test Suites: 1 passed, 1 total\nTests:       1 passed, 1 total\n')).toBe(1);
  });

  it('reads the passed count when a skipped or failed count precedes it', () => {
    const count = String(PASSED_AFTER_ANOTHER_COUNT);
    expect(readCollectedTestCount(`Tests:       1 skipped, ${count} passed, 5 total`)).toBe(PASSED_AFTER_ANOTHER_COUNT);
    expect(readCollectedTestCount(`      Tests  1 failed | ${count} passed (5)`)).toBe(PASSED_AFTER_ANOTHER_COUNT);
  });

  it('does not read the test-file count as the test count', () => {
    expect(readCollectedTestCount(' Test Files  1 passed (1)\n')).toBe(0);
    expect(readCollectedTestCount('Test Suites: 1 passed, 1 total\n')).toBe(0);
  });

  it('reads 0 when nothing was collected', () => {
    expect(readCollectedTestCount('No test files found, exiting with code 0\n')).toBe(0);
    expect(readCollectedTestCount('No tests found, exiting with code 0\n')).toBe(0);
    expect(readCollectedTestCount('      Tests  2 skipped (2)\n')).toBe(0);
  });
});

describe('findUnshippedFiles', () => {
  it('reports nothing for exactly what an Obsidian release carries', () => {
    expect(findUnshippedFiles(['main.js', 'manifest.json', 'styles.css'])).toEqual([]);
  });

  it('reports the license file that terser in webpack extracts by default', () => {
    expect(findUnshippedFiles(['main.js', 'main.js.LICENSE.txt', 'manifest.json'])).toEqual(['main.js.LICENSE.txt']);
  });

  it('leaves stray scripts, stylesheets and WebAssembly modules to the steps that own them', () => {
    expect(findUnshippedFiles(['main.js', '1.main.js', 'main.css', 'module.wasm', 'main.mjs'])).toEqual([]);
  });
});

describe('findUnbundledRequires', () => {
  it('passes what Obsidian and Node supply at runtime', () => {
    const bundle = [
      'require("obsidian")',
      'require(\'electron\')',
      'require("@codemirror/state")',
      'require("@lezer/common")',
      'require("node:async_hooks")',
      'require("fs")',
      'require("fs/promises")',
      'require("./chunk.js")'
    ].join(';');
    expect(findUnbundledRequires(bundle)).toEqual([]);
  });

  // What Parcel's node context emitted for every dependency, behind a green build.
  it('reports a package left external, once, with its subpath', () => {
    const bundle = 'require("obsidian");require("svelte");require("svelte/internal/client");require("svelte")';
    expect(findUnbundledRequires(bundle)).toEqual(['svelte', 'svelte/internal/client']);
  });

  it('judges a scoped subpath by its package, not by its scope', () => {
    expect(findUnbundledRequires('require("@codemirror-community/x");require("@babel/runtime/helpers")')).toEqual(['@babel/runtime/helpers', '@codemirror-community/x']);
  });

  // Vue's compiler writes this into a template string; it is never a require the bundle performs.
  it('ignores a specifier that interpolates', () => {
    // eslint-disable-next-line no-template-curly-in-string -- The string IS generated code; that is what is under test.
    expect(findUnbundledRequires('const code = `require("${l}")`;')).toEqual([]);
  });
});
