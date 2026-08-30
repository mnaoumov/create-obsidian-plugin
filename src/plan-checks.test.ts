import {
  describe,
  expect,
  it
} from 'vitest';

import type {
  PlanViolation,
  TemplateInventory
} from './plan-checks.ts';

import {
  ANSWER_SPACE_DIMENSION_SIZES,
  answersFromValueIndices,
  describeCase,
  makeAnswers
} from './answer-space.ts';
import { buildCoveringArray } from './covering-array.ts';
import {
  checkCase,
  checkPlan,
  checkUsage,
  collectRenderSections,
  collectUsage,
  dependencySignature,
  loadTemplateInventory,
  newUsage,
  parsePartialPath
} from './plan-checks.ts';
import { TemplateBuilder } from './template-builder.ts';

/** Builds a fixture inventory, deriving the whole-file index so it can never disagree with `partials`. */
function makeInventory(overrides: Partial<TemplateInventory> = {}): TemplateInventory {
  const partials = overrides.partials ?? [];
  const wholeFilePartialsByBase = new Map<string, string[]>();
  for (const partial of partials) {
    if (partial.section === null) {
      wholeFilePartialsByBase.set(partial.basePath, [...(wholeFilePartialsByBase.get(partial.basePath) ?? []), partial.partialName]);
    }
  }

  return {
    directTemplates: new Set<string>(),
    emptyTemplates: new Set<string>(),
    renderSites: [],
    ...overrides,
    partials,
    wholeFilePartialsByBase
  };
}

/**
 * The whole answer space at plan level, sampled at strength 2 so it runs on every `npm test`.
 *
 * Strength 2 is 49 cases and milliseconds, and covers every pair of answers -- enough that a partial
 * renamed out of lockstep with its base, or a question dropped from `FEATURE_REGISTRIES`, fails here
 * rather than in someone's generated project. `npm run verify:answer-space` runs the same checks over
 * the entire space; this is the part that is cheap enough to never be skipped.
 */
describe('the answer space at plan level', () => {
  const SWEEP_STRENGTH = 2;
  const inventory = loadTemplateInventory();
  const usage = newUsage();
  const failures: string[] = [];
  const signatures = new Set<string>();

  for (const valueIndices of buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength: SWEEP_STRENGTH })) {
    const answers = answersFromValueIndices(valueIndices);
    const result = checkCase(answers, inventory, usage);
    if (result.dependencySignature !== null) {
      signatures.add(result.dependencySignature);
    }
    for (const violation of result.violations) {
      failures.push(`[${violation.kind}] ${violation.subject}: ${violation.detail}\n    case: ${describeCase(answers)}`);
    }
  }

  it('builds a clean plan for every case in the covering array', () => {
    expect(failures).toEqual([]);
  });

  it('leaves no template file that nothing in the covering array can reach', () => {
    expect(checkUsage(usage, inventory).map((violation) => `[${violation.kind}] ${violation.subject}: ${violation.detail}`)).toEqual([]);
  });

  // Not a threshold to tune -- the install tier reuses one `node_modules` per distinct set, so a sudden
  // Collapse to a handful means the signature stopped distinguishing cases, not that the space shrank.
  it('declares many distinct dependency sets across the covering array', () => {
    expect(signatures.size).toBeGreaterThan(1);
  });
});

describe('parsePartialPath', () => {
  it('reads the whole-file form', () => {
    expect(parsePartialPath('dprint.json_odu.ejs')).toEqual({
      basePath: 'dprint.json',
      partialName: 'odu',
      path: 'dprint.json_odu.ejs',
      section: null
    });
  });

  it('reads the sectioned form', () => {
    expect(parsePartialPath('CONTRIBUTING.md@scripts_eslint.ejs')).toEqual({
      basePath: 'CONTRIBUTING.md',
      partialName: 'eslint',
      path: 'CONTRIBUTING.md@scripts_eslint.ejs',
      section: 'scripts'
    });
  });

  // The base of a nested composition is itself a partial path, so it carries a `_` of its own -- which
  // Is why the split reads right to left rather than finding the first separator.
  it('reads a nested composition, whose base is another partial', () => {
    expect(parsePartialPath('scripts/build.ts_standalone@bundler_esbuild.ejs')).toEqual({
      basePath: 'scripts/build.ts_standalone',
      partialName: 'esbuild',
      path: 'scripts/build.ts_standalone@bundler_esbuild.ejs',
      section: 'bundler'
    });
  });

  it('keeps a hyphenated partial name whole', () => {
    expect(parsePartialPath('.env@vault_has-vault-false.ejs')).toMatchObject({
      basePath: '.env',
      partialName: 'has-vault-false',
      section: 'vault'
    });
  });
});

describe('collectRenderSections', () => {
  it('reads the string form', () => {
    expect(collectRenderSections('<%- render(\'platform\') -%>')).toEqual(['platform']);
  });

  it('reads the options form', () => {
    expect(collectRenderSections('<%- render({ section: \'reload\', indentLevel: 1 }) -%>')).toEqual(['reload']);
  });

  it('ignores the no-section whole-file form', () => {
    expect(collectRenderSections('<%- render() -%>')).toEqual([]);
  });

  // `render(null, this.contentEl)` is Preact's mount call sitting in emitted plugin code, not a section.
  it('ignores a render call in emitted code rather than in an EJS tag', () => {
    expect(collectRenderSections('    render(null, this.contentEl);')).toEqual([]);
  });
});

describe('loadTemplateInventory', () => {
  const inventory = loadTemplateInventory();

  it('finds the real template tree', () => {
    expect(inventory.directTemplates.size).toBeGreaterThan(0);
    expect(inventory.partials.length).toBeGreaterThan(0);
    expect(inventory.renderSites.length).toBeGreaterThan(0);
  });

  it('finds no byte-empty template, which would render as nothing for every answer', () => {
    expect([...inventory.emptyTemplates]).toEqual([]);
  });
});

describe('checkPlan', () => {
  function kinds(violations: readonly PlanViolation[]): string[] {
    return violations.map((violation) => violation.kind);
  }

  it('passes a file that has its own .ejs', () => {
    const builder = new TemplateBuilder().addFiles(['README.md']);
    expect(checkPlan(builder, makeAnswers(), makeInventory({ directTemplates: new Set(['README.md']) }))).toEqual([]);
  });

  it('passes a file composed from a contributed partial', () => {
    const builder = new TemplateBuilder().addFiles(['dprint.json']).addPartial('odu');
    const inventory = makeInventory({ partials: [parsePartialPath('dprint.json_odu.ejs')] });
    expect(checkPlan(builder, makeAnswers(), inventory)).toEqual([]);
  });

  // The whole reason this tier exists: an unresolved partial renders as `''` rather than failing, so the
  // Destination is written empty and every later gate accepts it.
  it('flags a file none of whose partials are contributed', () => {
    const builder = new TemplateBuilder().addFiles(['dprint.json']).addPartial('standalone');
    const inventory = makeInventory({ partials: [parsePartialPath('dprint.json_odu.ejs')] });
    const violations = checkPlan(builder, makeAnswers(), inventory);
    expect(kinds(violations)).toEqual(['empty-emitted-file']);
    expect(violations[0]?.detail).toContain('odu');
  });

  it('flags a file with neither its own .ejs nor any partial', () => {
    const builder = new TemplateBuilder().addFiles(['nothing.json']);
    expect(kinds(checkPlan(builder, makeAnswers(), makeInventory()))).toEqual(['empty-emitted-file']);
  });

  it('flags a direct template whose .ejs is byte-empty', () => {
    const builder = new TemplateBuilder().addFiles(['README.md']);
    const inventory = makeInventory({ directTemplates: new Set(['README.md']), emptyTemplates: new Set(['README.md']) });
    expect(kinds(checkPlan(builder, makeAnswers(), inventory))).toEqual(['empty-emitted-file']);
  });

  it('skips registered paths that the generator itself treats as partials', () => {
    const builder = new TemplateBuilder().addFiles(['some_partial.md']);
    expect(checkPlan(builder, makeAnswers(), makeInventory())).toEqual([]);
  });

  it('flags a script whose file was never registered', () => {
    const builder = new TemplateBuilder().addScript('build');
    const violations = checkPlan(builder, makeAnswers(), makeInventory());
    expect(kinds(violations)).toEqual(['missing-script-file']);
    expect(violations[0]?.detail).toContain('scripts/build.ts');
  });

  it('passes a script whose file was registered', () => {
    const builder = new TemplateBuilder().addScript('build').addFiles(['scripts/build.ts']);
    expect(checkPlan(builder, makeAnswers(), makeInventory({ directTemplates: new Set(['scripts/build.ts']) }))).toEqual([]);
  });

  it('leaves a non-convention script command alone', () => {
    const builder = new TemplateBuilder().addScript('release', 'gh release create');
    expect(checkPlan(builder, makeAnswers(), makeInventory())).toEqual([]);
  });
});

describe('checkCase', () => {
  const inventory = loadTemplateInventory();

  it('records the dependency set a case declares', () => {
    const result = checkCase(makeAnswers(), inventory);
    expect(result.dependencySignature).toMatch(/^[0-9a-f]{64}$/);
  });

  // A saved `.create-obsidian-plugin.json` carrying a value the generator no longer offers reaches
  // `resolveFeature` and throws. A sweep must report that as one case's finding, not die on it.
  it('reports a plan that cannot be built at all instead of throwing', () => {
    const result = checkCase(makeAnswers({ preset: 'no-such-preset' }), inventory);
    expect(result.dependencySignature).toBeNull();
    expect(result.violations.map((violation) => violation.kind)).toEqual(['plan-threw']);
    expect(result.violations[0]?.detail).toContain('no-such-preset');
  });
});

describe('dependencySignature', () => {
  it('is stable for the same dependency set', () => {
    const first = new TemplateBuilder().addPackage('a').addPackage('b');
    const second = new TemplateBuilder().addPackage('b').addPackage('a');
    expect(dependencySignature(first)).toBe(dependencySignature(second));
  });

  it('differs when a spec differs, not only when a name does', () => {
    const floating = new TemplateBuilder().addPackage('a');
    const pinned = new TemplateBuilder().addPackage('a', '1.2.3');
    expect(dependencySignature(floating)).not.toBe(dependencySignature(pinned));
  });
});

describe('checkUsage', () => {
  function usageOf(builder: TemplateBuilder): ReturnType<typeof newUsage> {
    const usage = newUsage();
    collectUsage(builder, usage);
    return usage;
  }

  it('flags a partial no answer contributes', () => {
    const usage = usageOf(new TemplateBuilder().addFiles(['manifest.json']).addPartial('common'));
    const inventory = makeInventory({
      directTemplates: new Set(['manifest.json']),
      partials: [parsePartialPath('manifest.json@platform_desktop-only.ejs')],
      renderSites: []
    });
    expect(checkUsage(usage, inventory).map((violation) => violation.kind)).toEqual(['orphan-partial']);
  });

  it('flags a partial whose base is neither registered nor another partial', () => {
    const usage = usageOf(new TemplateBuilder().addPartial('odu'));
    const inventory = makeInventory({
      directTemplates: new Set<string>(),
      partials: [parsePartialPath('gone.json_odu.ejs')],
      renderSites: []
    });
    expect(checkUsage(usage, inventory).map((violation) => violation.kind)).toEqual(['dead-partial-base']);
  });

  it('accepts a nested partial whose base is another partial', () => {
    const usage = usageOf(new TemplateBuilder().addFiles(['scripts/build.ts']).addPartial('standalone').addPartial('esbuild'));
    const inventory = makeInventory({
      directTemplates: new Set<string>(),
      partials: [
        parsePartialPath('scripts/build.ts_standalone.ejs'),
        parsePartialPath('scripts/build.ts_standalone@bundler_esbuild.ejs')
      ],
      renderSites: []
    });
    expect(checkUsage(usage, inventory)).toEqual([]);
  });

  it('flags a render section no partial file answers at all', () => {
    const usage = usageOf(new TemplateBuilder().addFiles(['manifest.json']).addPartial('common'));
    const inventory = makeInventory({
      directTemplates: new Set(['manifest.json']),
      partials: [],
      renderSites: [{ basePath: 'manifest.json', section: 'platform' }]
    });
    const violations = checkUsage(usage, inventory);
    expect(violations.map((violation) => violation.kind)).toEqual(['unreachable-render-section']);
    expect(violations[0]?.detail).toContain('No partial file answers it at all');
  });

  it('accepts a render section a contributed partial answers', () => {
    const usage = usageOf(new TemplateBuilder().addFiles(['manifest.json']).addPartial('desktop-only'));
    const inventory = makeInventory({
      directTemplates: new Set(['manifest.json']),
      partials: [parsePartialPath('manifest.json@platform_desktop-only.ejs')],
      renderSites: [{ basePath: 'manifest.json', section: 'platform' }]
    });
    expect(checkUsage(usage, inventory)).toEqual([]);
  });
});
