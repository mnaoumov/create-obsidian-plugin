import type { Linter } from 'eslint';

import { ESLint } from 'eslint';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  expect,
  it
} from 'vitest';

it('discovers the root config for every script and reports script violations', async () => {
  const eslint = new ESLint();
  const scriptsDir = import.meta.dirname;
  for (const file of readdirSync(scriptsDir).filter((name) => name.endsWith('.ts'))) {
    const config = await eslint.calculateConfigForFile(join(scriptsDir, file)) as Linter.Config | undefined;
    expect(config?.rules?.['no-console'], file).toBeDefined();
    expect(config?.languageOptions, file).toMatchObject({ parserOptions: { projectService: true } });
  }

  const results = await eslint.lintText('console.log("script lint must run");\n', {
    filePath: join(scriptsDir, 'lint.ts')
  });
  expect(results.flatMap((result) => result.messages).some((message) => message.ruleId === 'no-console')).toBe(true);
});

it('rejects keyword bindings while preserving imported names and property keys', async () => {
  const eslint = new ESLint();
  const results = await eslint.lintText(
    'import { symbol as $symbol } from \'@clack/prompts\';\nconst event = $symbol(\'submit\');\nconst $event = { event };\nconsole.error($event.event);\n',
    { filePath: join(import.meta.dirname, 'lint.ts') }
  );
  const messages = results.flatMap((result) => result.messages)
    .filter((message) => message.ruleId === 'typescript-dev-toolkit/no-keyword-identifiers');
  expect(messages).toHaveLength(1);
  expect(messages[0]?.message).toContain('event');
});

it('checks unused bindings without enabling the unsupported module graph rule', async () => {
  const eslint = new ESLint();
  const filePath = join(import.meta.dirname, 'lint.ts');
  const config = await eslint.calculateConfigForFile(filePath) as Linter.Config | undefined;
  expect(config?.rules?.['import-x/no-unused-modules']).toBeUndefined();

  const results = await eslint.lintText('const unusedBinding = 1;\nexport {};\n', { filePath });
  const messages = results.flatMap((result) => result.messages);
  expect(messages.some((message) => message.ruleId === '@typescript-eslint/no-unused-vars')).toBe(true);

  const usedResults = await eslint.lintText('const usedBinding = 1;\nconsole.error(usedBinding);\nexport {};\n', { filePath });
  expect(
    usedResults.flatMap((result) => result.messages)
      .filter((message) => message.ruleId === '@typescript-eslint/no-unused-vars')
  ).toHaveLength(0);
});
