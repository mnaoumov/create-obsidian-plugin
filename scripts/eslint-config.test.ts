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
