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
