import type { Linter } from 'eslint';

import { ESLint } from 'eslint';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  beforeAll,
  expect,
  it
} from 'vitest';

const LINT_FILE_PATH = join(import.meta.dirname, 'lint.ts');

// Two one-time costs dominate this file: loading the shared config with every plugin it registers, and the first
// Typed lint, which builds the TypeScript program over the whole tsconfig. On 2026-11-16, with the CPU at 90% from
// Other work, they took 21 s and 34 s, and every later call took under 0.2 s. So they are paid once, here, under
// Their own bound, and each case keeps the suite's 30 s.
const SETUP_TIMEOUT_MILLISECONDS = 180_000;

let eslint: ESLint;

beforeAll(async () => {
  eslint = new ESLint();
  await eslint.lintText('export {};\n', { filePath: LINT_FILE_PATH });
}, SETUP_TIMEOUT_MILLISECONDS);

it('discovers the root config for every script and reports script violations', async () => {
  const scriptsDir = import.meta.dirname;
  for (const file of readdirSync(scriptsDir).filter((name) => name.endsWith('.ts'))) {
    const config = await eslint.calculateConfigForFile(join(scriptsDir, file)) as Linter.Config | undefined;
    expect(config?.rules?.['no-console'], file).toBeDefined();
    expect(config?.languageOptions, file).toMatchObject({ parserOptions: { projectService: true } });
  }

  const results = await eslint.lintText('console.log("script lint must run");\n', { filePath: LINT_FILE_PATH });
  expect(results.flatMap((result) => result.messages).some((message) => message.ruleId === 'no-console')).toBe(true);
});

it('rejects keyword bindings while preserving imported names and property keys', async () => {
  const results = await eslint.lintText(
    'import { symbol as $symbol } from \'@clack/prompts\';\nconst event = $symbol(\'submit\');\nconst $event = { event };\nconsole.error($event.event);\n',
    { filePath: LINT_FILE_PATH }
  );
  const messages = results.flatMap((result) => result.messages)
    .filter((message) => message.ruleId === 'typescript-dev-toolkit/no-keyword-identifiers');
  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain('event');
});

it('checks unused bindings without enabling the unsupported module graph rule', async () => {
  const config = await eslint.calculateConfigForFile(LINT_FILE_PATH) as Linter.Config | undefined;
  expect(config?.rules?.['import-x/no-unused-modules']).toBeUndefined();

  const results = await eslint.lintText('const unusedBinding = 1;\nexport {};\n', { filePath: LINT_FILE_PATH });
  const messages = results.flatMap((result) => result.messages);
  expect(messages.some((message) => message.ruleId === '@typescript-eslint/no-unused-vars')).toBe(true);

  const usedResults = await eslint.lintText('const usedBinding = 1;\nconsole.error(usedBinding);\nexport {};\n', {
    filePath: LINT_FILE_PATH
  });
  expect(
    usedResults.flatMap((result) => result.messages)
      .filter((message) => message.ruleId === '@typescript-eslint/no-unused-vars')
  ).toHaveLength(0);
});
