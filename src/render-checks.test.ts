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

import type { RenderViolation } from './render-checks.ts';

import {
  ANSWER_SPACE_DIMENSION_SIZES,
  answersFromValueIndices,
  describeCase,
  makeAnswers
} from './answer-space.ts';
import { buildCoveringArray } from './covering-array.ts';
import {
  checkRenderedProject,
  renderAndCheck
} from './render-checks.ts';

describe('checkRenderedProject', () => {
  let targetDir: string;

  beforeEach(() => {
    targetDir = mkdtempSync(join(tmpdir(), 'cop-render-check-'));
  });

  afterEach(() => {
    rmSync(targetDir, { force: true, recursive: true });
  });

  function put(relativePath: string, content: string): void {
    const full = join(targetDir, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }

  function kindsFor(relativePath: string): string[] {
    return checkRenderedProject(targetDir, makeAnswers())
      .filter((violation) => violation.subject === relativePath)
      .map((violation) => violation.kind);
  }

  function detailFor(relativePath: string): string {
    return checkRenderedProject(targetDir, makeAnswers()).find((violation: RenderViolation) => violation.subject === relativePath)?.detail ?? '';
  }

  // The assertion the whole tier exists for: an unresolved partial renders as `''` rather than failing,
  // And an empty `.ts` compiles, an empty config reads as "no configuration", and every existence check
  // On it passes.
  it('flags an emitted file that is empty', () => {
    put('src/plugin.ts', '');
    expect(kindsFor('src/plugin.ts')).toContain('empty-file');
  });

  it('flags a file that is only whitespace', () => {
    put('src/plugin.ts', '\n\n   \n');
    expect(kindsFor('src/plugin.ts')).toContain('empty-file');
  });

  it('accepts a .gitkeep, which exists to be empty', () => {
    put('src/wasm/.gitkeep', '');
    expect(kindsFor('src/wasm/.gitkeep')).toEqual([]);
  });

  it('flags an unrendered EJS tag', () => {
    put('README.md', '# <%= pluginName %>\n');
    expect(kindsFor('README.md')).toContain('unrendered-ejs');
  });

  it('flags an object interpolated where a value was meant', () => {
    put('README.md', '# [object Object]\n');
    expect(kindsFor('README.md')).toContain('placeholder-leaked');
  });

  it('flags JSON that does not parse', () => {
    put('manifest.json', '{ "id": "x",, }');
    expect(kindsFor('manifest.json')).toContain('invalid-json');
  });

  it('accepts JSON that parses', () => {
    put('manifest.json', '{ "id": "x" }');
    expect(kindsFor('manifest.json')).toEqual([]);
  });

  // Workflow steps are concatenated from partials, so a partial indented one level off produces YAML
  // That is still text but no longer the document anyone intended.
  it('flags YAML that does not parse', () => {
    put('.github/workflows/ci.yml', 'on:\n  push:\n   branches: [main]\n  bad\n    worse: 1\n');
    expect(kindsFor('.github/workflows/ci.yml')).toContain('invalid-yaml');
  });

  it('accepts YAML that parses', () => {
    put('.github/workflows/ci.yml', 'on:\n  push:\n    branches: [main]\n');
    expect(kindsFor('.github/workflows/ci.yml')).toEqual([]);
  });

  it('flags TypeScript that does not parse', () => {
    put('src/plugin.ts', 'export class Broken {\n  onload(): void {\n');
    expect(kindsFor('src/plugin.ts')).toContain('invalid-typescript');
  });

  it('accepts TypeScript that parses', () => {
    put('src/plugin.ts', 'export const value: number = 1;\n');
    expect(kindsFor('src/plugin.ts')).toEqual([]);
  });

  it('parses .tsx as TSX rather than as TypeScript generics', () => {
    put('src/view.tsx', 'export const view = (): unknown => <div>hello</div>;\n');
    expect(kindsFor('src/view.tsx')).toEqual([]);
  });

  // A partial does not know what it is rendered into. `await import(…)` parses fine and reads fine on
  // Its own, but the CLI-bundler build script drops the hot-reload partial inside a SYNCHRONOUS
  // Function -- TS1308, plus a hard `ParseError: Unexpected reserved word 'await'` from the bundler.
  it('flags await inside a synchronous function', () => {
    put('scripts/build.ts', 'export function reload(): void {\n  const { execSync } = await import(\'node:child_process\');\n  execSync(\'x\');\n}\n');
    expect(kindsFor('scripts/build.ts')).toContain('await-outside-async');
  });

  it('accepts await at the top level of a module', () => {
    put('scripts/build.ts', 'const { execSync } = await import(\'node:child_process\');\nexecSync(\'x\');\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  it('accepts await inside an async function', () => {
    put('scripts/build.ts', 'export async function reload(): Promise<void> {\n  await Promise.resolve();\n}\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  it('accepts await inside an async arrow function', () => {
    put('scripts/build.ts', 'export const reload = async (): Promise<void> => {\n  await Promise.resolve();\n};\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  // The other half of the same trap: a wrapper rendering `if (prod) { <section> }` emits an EMPTY
  // `if (prod) { }` on every answer that contributes no partial, which the generated ESLint config
  // Rejects with `no-empty`.
  it('flags an empty block statement', () => {
    put('scripts/build.ts', 'const prod = true;\nif (prod) {\n}\n');
    expect(kindsFor('scripts/build.ts')).toContain('empty-block');
  });

  it('accepts an empty block that holds a comment, as no-empty does', () => {
    put('scripts/build.ts', 'try {\n  JSON.parse(\'{}\');\n} catch {\n  // Nothing to do.\n}\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  it('accepts an empty function body, which no-empty also leaves alone', () => {
    put('scripts/build.ts', 'export function noop(): void {}\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  // What a per-answer partial that is not actually per-answer looks like in the bytes. Five styling
  // Partials each emitted the same `MiniCssExtractPlugin` import, and three UI-framework partials the
  // Same babel import and `const`; a preset forcing a second answer in the same question rendered both
  // Copies, and the file failed to compile with TS2300 / TS2451.
  it('flags an identifier imported twice at the top level', () => {
    put('scripts/webpack.config.ts', 'import MiniCssExtractPlugin from \'mini-css-extract-plugin\';\nimport MiniCssExtractPlugin from \'mini-css-extract-plugin\';\n');
    expect(kindsFor('scripts/webpack.config.ts')).toContain('duplicate-declaration');
  });

  it('flags a top-level const declared twice', () => {
    put('scripts/rollup.config.ts', 'const babel = 1;\nconst babel = 2;\n');
    expect(kindsFor('scripts/rollup.config.ts')).toContain('duplicate-declaration');
  });

  it('accepts function overloads, which declare one name on purpose', () => {
    put('src/plugin.ts', 'export function pick(value: string): string;\nexport function pick(value: number): number;\nexport function pick(value: unknown): unknown {\n  return value;\n}\n');
    expect(kindsFor('src/plugin.ts')).toEqual([]);
  });

  it('accepts repeated module declarations, which merge by design', () => {
    put('src/styles/styles.d.ts', 'declare module \'*.css\';\ndeclare module \'*.scss\';\n');
    expect(kindsFor('src/styles/styles.d.ts')).toEqual([]);
  });

  // `obsidian` rather than a bundler plugin, because the fixture has to name a package the default
  // Answers actually declare -- otherwise `undeclared-dependency` fires and the assertion is about the
  // Wrong thing.
  it('accepts two imports of the same module under different names', () => {
    put('scripts/rollup.config.ts', 'import obsidianDefault from \'obsidian\';\nimport { Plugin } from \'obsidian\';\nvoid obsidianDefault;\nvoid Plugin;\n');
    expect(kindsFor('scripts/rollup.config.ts')).toEqual([]);
  });

  // Npm hoists a transitive peer into the root, so an undeclared package resolves exactly like a
  // Declared one and the project works by accident. pnpm's strict layout does not. That is how the
  // ESLint answer went its whole life without declaring `eslint`.
  it('flags a package that is imported but never declared', () => {
    put('scripts/lint.ts', 'import { chunk } from \'lodash\';\nvoid chunk;\n');
    expect(kindsFor('scripts/lint.ts')).toContain('undeclared-dependency');
  });

  it('accepts a subpath of a declared package', () => {
    put('src/plugin.ts', 'import { Plugin } from \'obsidian/some/subpath\';\nvoid Plugin;\n');
    expect(kindsFor('src/plugin.ts')).toEqual([]);
  });

  it('accepts node builtins, with and without the node: prefix', () => {
    put('scripts/build.ts', 'import { join } from \'node:path\';\nimport { EOL } from \'os\';\nvoid join;\nvoid EOL;\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  it('flags a package.json script whose file was not emitted', () => {
    put('package.json', JSON.stringify({ scripts: { build: 'jiti scripts/build.ts' } }));
    expect(kindsFor('scripts/build.ts')).toContain('script-file-missing');
  });

  it('accepts a package.json script whose file was emitted', () => {
    put('package.json', JSON.stringify({ scripts: { build: 'jiti scripts/build.ts' } }));
    put('scripts/build.ts', 'export const build = 1;\n');
    expect(kindsFor('scripts/build.ts')).toEqual([]);
  });

  it('flags an emitted script that disagrees with the plan', () => {
    put('package.json', JSON.stringify({ scripts: { build: 'jiti scripts/wrong.ts' } }));
    expect(detailFor('package.json scripts.build')).toContain('jiti scripts/build.ts');
  });
});

describe('renderAndCheck', () => {
  let targetDir: string;

  beforeEach(() => {
    targetDir = mkdtempSync(join(tmpdir(), 'cop-render-'));
  });

  afterEach(() => {
    rmSync(targetDir, { force: true, recursive: true });
  });

  it('renders a real case cleanly', () => {
    expect(renderAndCheck(makeAnswers(), targetDir)).toEqual([]);
  });

  it('reports a render that throws instead of throwing', () => {
    const violations = renderAndCheck(makeAnswers({ preset: 'no-such-preset' }), targetDir);
    expect(violations.map((violation) => violation.kind)).toEqual(['render-threw']);
  });
});

/**
 * Every case of a strength-2 covering array, rendered to disk and checked.
 *
 * Supersedes the preset x uiFramework empty-file sweep this suite used to carry: that walked 21 hand-
 * listed combinations of two questions, where this covers every PAIR of answers across all 23 -- and
 * checks JSON, YAML and TypeScript validity on top of emptiness. Strength 3 and beyond belongs to
 * `npm run verify:rendering`, which shards it across processes; this is the part that is cheap enough
 * to run on every commit.
 */
describe('the answer space, rendered', () => {
  const SWEEP_STRENGTH = 2;
  const failures: string[] = [];
  let cases = 0;

  for (const valueIndices of buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength: SWEEP_STRENGTH })) {
    const answers = answersFromValueIndices(valueIndices);
    const targetDir = mkdtempSync(join(tmpdir(), 'cop-render-sweep-'));
    cases++;
    try {
      for (const violation of renderAndCheck(answers, targetDir)) {
        failures.push(`[${violation.kind}] ${violation.subject}: ${violation.detail}\n    case: ${describeCase(answers)}`);
      }
    } finally {
      rmSync(targetDir, { force: true, recursive: true });
    }
  }

  it('renders every case in the covering array without a violation', () => {
    expect(failures).toEqual([]);
  });

  it('actually rendered the covering array', () => {
    expect(cases).toBeGreaterThan(1);
  });
});
