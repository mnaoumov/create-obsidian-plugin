import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
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

import { createProjectFormatter } from './project-formatter.ts';

describe('createProjectFormatter', () => {
  let targetDir: string;

  beforeEach(() => {
    targetDir = mkdtempSync(join(tmpdir(), 'obsidian-plugin-formatter-test-'));
  });

  afterEach(() => {
    rmSync(targetDir, { force: true, recursive: true });
  });

  // The templates already pass dprint's check, so there is nothing a dprint project's files could differ by.
  it.each(['none', 'dprint'])('has no formatter for %s', (formatter) => {
    expect(createProjectFormatter(targetDir, formatter)).toBeNull();
  });

  it.each(['prettier', 'biome'])('has no formatter for %s before it is installed', (formatter) => {
    expect(createProjectFormatter(targetDir, formatter)).toBeNull();
  });

  // Run through `node`, so the stand-in only has to be a script that echoes what it was given.
  it('runs the installed formatter over the content it is given', () => {
    const packageDir = join(targetDir, 'node_modules', 'prettier');
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ bin: './bin.cjs' }));
    writeFileSync(join(packageDir, 'bin.cjs'), 'process.stdin.on(\'data\', (chunk) => process.stdout.write(String(chunk).toUpperCase()));\n');

    const formatter = createProjectFormatter(targetDir, 'prettier');
    expect(formatter?.formatContent('src/main.ts', 'const x = 1;\n')).toBe('CONST X = 1;\n');
  });

  it('reports nothing for a file the formatter refuses', () => {
    const packageDir = join(targetDir, 'node_modules', '@biomejs', 'biome');
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ bin: { biome: 'bin/biome' } }));
    mkdirSync(join(packageDir, 'bin'));
    writeFileSync(join(packageDir, 'bin', 'biome'), 'process.exit(1);\n');

    expect(createProjectFormatter(targetDir, 'biome')?.formatContent('LICENSE', 'text\n')).toBeNull();
  });
});
