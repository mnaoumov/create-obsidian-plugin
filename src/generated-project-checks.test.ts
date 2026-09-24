import {
  describe,
  expect,
  it
} from 'vitest';

import { readCollectedTestCount } from './generated-project-checks.ts';

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
