import {
  mkdtempSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describe,
  expect,
  it
} from 'vitest';

import { makeAnswers } from './answer-space.ts';
import {
  findBlockingAdvisories,
  findStalePins,
  findUnbundledRequires,
  findUnshippedFiles,
  readCollectedTestCount,
  runGate
} from './generated-project-checks.ts';
import { Dependency } from './template-builder.ts';
import {
  buildPinnedVersionsJson,
  PINNED_VERSIONS
} from './versions.ts';

describe('findBlockingAdvisories', () => {
  const braces = { severity: 'high', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' };
  const report = {
    vulnerabilities: {
      braces: { via: [braces] },
      katex: { via: [{ severity: 'low', url: 'https://github.com/advisories/GHSA-238p-pmpm-9mq7' }] },
      micromatch: { via: ['braces'] }
    }
  };

  it('passes a report whose only high advisory is accepted, however many packages npm marks high', () => {
    expect(findBlockingAdvisories(report, new Set(['GHSA-vfj7-8cjw-p6xm']))).toEqual([]);
  });

  it('names a high advisory that is not accepted, once', () => {
    expect(findBlockingAdvisories(report, new Set())).toEqual(['GHSA-vfj7-8cjw-p6xm']);
  });

  it('blocks a critical advisory beside an accepted high one', () => {
    const critical = { severity: 'critical', url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' };
    const withCritical = { vulnerabilities: { ...report.vulnerabilities, other: { via: [critical] } } };
    expect(findBlockingAdvisories(withCritical, new Set(['GHSA-vfj7-8cjw-p6xm']))).toEqual(['GHSA-aaaa-bbbb-cccc']);
  });
});

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

describe('findStalePins', () => {
  const PINS = JSON.stringify({
    comment: ['Release conditions.'],
    pins: {
      held: { check: 'print held', expect: '^1.0.0', section: 'devDependencies', why: 'still needed' },
      manual: { check: null, manualCheck: 'look by hand', section: 'devDependencies', why: 'no check' },
      moved: { check: 'print moved', expect: '^16.0.0', section: 'devDependencies', why: 'the peer moved' }
    }
  });
  const OUTPUTS: Record<string, string> = { 'print held': '^1.0.0', 'print moved': '^17.3.0' };

  it('reports a pin whose check no longer prints what it expects, and only that one', () => {
    expect(findStalePins(PINS, (command) => ({ ok: true, output: OUTPUTS[command] ?? '' }))).toEqual([
      'moved: the check printed "^17.3.0", the pin expects "^16.0.0"'
    ]);
  });

  it('reports a check that cannot run, since it would never retire its pin', () => {
    expect(findStalePins(PINS, (command) => command === 'print held' ? { ok: false, output: 'Cannot find module' } : { ok: true, output: '^16.0.0' })).toEqual([
      'held: the check failed to run: Cannot find module'
    ]);
  });

  it('runs the checks of the file the generator actually writes', () => {
    const json = buildPinnedVersionsJson([new Dependency('@codemirror/state'), new Dependency('obsidian')]);
    const commands: string[] = [];
    findStalePins(json, (command) => {
      commands.push(command);
      return { ok: true, output: '' };
    });
    expect(commands).toEqual([PINNED_VERSIONS['@codemirror/state']?.check]);
  });

  it('refuses a file with no pins object rather than passing it', () => {
    expect(() => findStalePins(JSON.stringify({ comment: [] }), () => ({ ok: true, output: '' }))).toThrow('no "pins" object');
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

describe('runGate', () => {
  it('reports a package manager this machine lacks as could-not-run, not as a failed install', () => {
    const targetDir = mkdtempSync(join(tmpdir(), 'cop-gate-missing-'));
    try {
      const answers = { ...makeAnswers(), packageManager: 'no-such-package-manager' };
      const result = runGate(targetDir, answers);
      expect(result.couldNotRun).toBe('no-such-package-manager not installed');
      expect(result.violations).toEqual([]);
      expect(result.passed).toEqual([]);
    } finally {
      rmSync(targetDir, { force: true, recursive: true });
    }
  });
});
