import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  describe,
  expect,
  it
} from 'vitest';

import { INITIAL_COMMIT_MESSAGE } from './git-hooks.ts';

const COMMITLINT_TIMEOUT_MS = 60_000;

describe('INITIAL_COMMIT_MESSAGE', () => {
  // The scaffold's first commit runs through the generated `commit-msg` hook, which lints against
  // `@commitlint/config-conventional`, so a message that fails here would fail the scaffold's commit.
  it('passes @commitlint/config-conventional', () => {
    const cli = join(process.cwd(), 'node_modules', '@commitlint', 'cli', 'cli.js');
    expect(() =>
      execFileSync(process.execPath, [cli, '--extends', '@commitlint/config-conventional'], {
        input: INITIAL_COMMIT_MESSAGE,
        stdio: ['pipe', 'pipe', 'pipe']
      })
    ).not.toThrow();
  }, COMMITLINT_TIMEOUT_MS);
});
