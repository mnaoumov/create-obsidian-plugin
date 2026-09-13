import {
  describe,
  expect,
  it
} from 'vitest';

import type {
  BaselineEntry,
  DriftDimension,
  DriftFinding,
  ProjectProfile
} from './plugin-drift-checks.ts';

import {
  buildConsensus,
  compareToPlugins,
  findingKey,
  PLUGIN_SHAPED_ANSWERS,
  pluginShapedAnswers,
  reconcileBaseline
} from './plugin-drift-checks.ts';

/** How many plugins a consensus fixture pretends to have profiled, chosen so halves are exact. */
const PLUGIN_COUNT = 10;

/** A pair and a triple, for the small fixtures whose expected counts are written out by hand. */
const PAIR = 2;

const TRIPLE = 3;

/** Exactly the partial-reporting floor of the fixture plugin set, so the boundary can be tested on both sides. */
const HALF_THE_PLUGINS = PLUGIN_COUNT / PAIR;

describe('buildConsensus', () => {
  it('counts a trait across every profile that carries it', () => {
    const consensus = buildConsensus([
      profile({ scripts: { build: 'jiti scripts/build.ts' } }),
      profile({ scripts: { build: 'jiti scripts/build.ts' } }),
      profile({ scripts: { lint: 'jiti scripts/lint.ts' } })
    ]);

    expect(consensus.total).toBe(TRIPLE);
    expect(consensus.traits.get('scripts')?.get('build')).toEqual({ count: PAIR, value: 'jiti scripts/build.ts' });
    expect(consensus.traits.get('scripts')?.get('lint')).toEqual({ count: 1, value: 'jiti scripts/lint.ts' });
  });

  it('takes the most common value when the plugins that carry a trait disagree', () => {
    const consensus = buildConsensus([
      profile({ scripts: { build: 'a' } }),
      profile({ scripts: { build: 'b' } }),
      profile({ scripts: { build: 'b' } })
    ]);

    expect(consensus.traits.get('scripts')?.get('build')).toEqual({ count: TRIPLE, value: 'b' });
  });

  // Two values on the same count must not depend on the order the directories happened to be read in,
  // Or the same plugin set produces a different baseline on a different machine.
  it('breaks a tie on the value, not on profile order', () => {
    const forwards = buildConsensus([profile({ scripts: { build: 'a' } }), profile({ scripts: { build: 'b' } })]);
    const backwards = buildConsensus([profile({ scripts: { build: 'b' } }), profile({ scripts: { build: 'a' } })]);

    expect(forwards.traits.get('scripts')?.get('build')?.value).toBe('a');
    expect(backwards.traits.get('scripts')?.get('build')?.value).toBe('a');
  });
});

describe('compareToPlugins', () => {
  it('reports a unanimous trait the generator lacks as missing', () => {
    const findings = compareToPlugins(unanimous({ 'build:clean': 'jiti scripts/build-clean.ts' }), profile({}));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('missing');
    expect(findings[0]?.pluginCount).toBe(PLUGIN_COUNT);
  });

  it('reports a unanimous trait whose value differs as differs, not as missing plus extra', () => {
    const findings = compareToPlugins(unanimous({ build: 'jiti scripts/build.ts' }), profile({ scripts: { build: 'tsc' } }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('differs');
    expect(findings[0]?.generatedValue).toBe('tsc');
  });

  it('reports a trait no real plugin has as extra', () => {
    const findings = compareToPlugins(unanimous({ build: 'jiti scripts/build.ts' }), profile({ scripts: { 'build': 'jiti scripts/build.ts', 'test:e2e': 'jiti scripts/test-e2e.ts' } }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('extra');
    expect(findings[0]?.key).toBe('test:e2e');
  });

  it('says nothing about a divided trait the generator already has', () => {
    expect(compareToPlugins(divided(PLUGIN_COUNT - 1, 'capture-screenshots.ts'), profile({ layout: { 'capture-screenshots.ts': '' } }))).toEqual([]);
  });

  // A dimension the real plugins have no trait in at all would otherwise never be scanned, so everything the
  // Generator emits under it would go unreported -- silently, which is the failure mode this whole
  // Verification design is shaped around.
  it('reports an extra in a dimension the real plugins have nothing in', () => {
    const findings = compareToPlugins(buildConsensus([profile({})]), profile({ workflows: { '.github/workflows/ci.yml': '' } }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('extra');
    expect(findings[0]?.dimension).toBe('workflows');
  });

  it('reports a divided trait the generator lacks as partial, carrying the count as the evidence', () => {
    const findings = compareToPlugins(divided(PLUGIN_COUNT - 1, 'capture:screenshots'), profile({}));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('partial');
    expect(findings[0]?.pluginCount).toBe(PLUGIN_COUNT - 1);
    expect(findings[0]?.pluginTotal).toBe(PLUGIN_COUNT);
  });

  // Without the floor this dimension is unusable rather than merely noisy: the first real run produced
  // 1793 findings, and all but a few dozen were one plugin's own demo-vault content at 1 of 29.
  it('stays silent about a trait a minority of the real plugins carries', () => {
    expect(compareToPlugins(divided(1, 'one-plugins-own-note.md'), profile({}))).toEqual([]);
    expect(compareToPlugins(divided(HALF_THE_PLUGINS - 1, 'nearly-half.md'), profile({}))).toEqual([]);
  });

  it('reports a trait exactly at the floor', () => {
    expect(compareToPlugins(divided(HALF_THE_PLUGINS, 'half.md'), profile({}))).toHaveLength(1);
  });
});

describe('pluginShapedAnswers', () => {
  it('carries every measured real-plugin answer through, and takes the preset from its argument', () => {
    const answers = pluginShapedAnswers('demo');

    expect(answers.preset).toBe('demo');
    expect(answers.bundler).toBe('esbuild');
    expect(answers.testRunner).toBe('vitest');
  });

  // The one answer that reads oddly, so it is asserted rather than left to a comment. No real plugin
  // Has a `ci.yml` or a `release.yml`; asking for them would report the generator's own CI workflows as
  // Drift the real plugins chose not to have, and bury the finding that the one workflow all 29 DO ship is
  // Emitted by no answer at all.
  it('asks for no CI workflows, because no real plugin has one', () => {
    expect(PLUGIN_SHAPED_ANSWERS.gitHubActions).toBe('none');
  });
});

describe('reconcileBaseline', () => {
  it('fails a drift with no entry', () => {
    const violations = reconcileBaseline(scoped([finding('scripts', 'missing', 'prepare', PLUGIN_COUNT)]), {});

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('unbaselined-drift');
    expect(violations[0]?.key).toBe('enhanced/scripts/missing/prepare');
  });

  it('accepts a drift the baseline records at the same count', () => {
    expect(reconcileBaseline(scoped([finding('scripts', 'missing', 'prepare', PLUGIN_COUNT)]), {
      'enhanced/scripts/missing/prepare': entry(PLUGIN_COUNT)
    })).toEqual([]);
  });

  // The presets do not emit the same project, so baselining a demo-only difference must not silence the
  // Same key under enhanced, where it would be a genuine surprise.
  it('keeps the entry for one preset from silencing the other', () => {
    const violations = reconcileBaseline(
      new Map([
        ['demo', [finding('layout', 'extra', 'src/react-components/sample.tsx', 0)]],
        ['enhanced', [finding('layout', 'extra', 'src/react-components/sample.tsx', 0)]]
      ]),
      { 'demo/layout/extra/src/react-components/sample.tsx': entry(0) }
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.key).toBe('enhanced/layout/extra/src/react-components/sample.tsx');
  });

  // The count IS the evidence behind most of these judgements, so a trait that went from a divided
  // Majority to unanimous needs the call made again rather than silently kept.
  it('re-reports an entry whose real-plugin count has moved', () => {
    const violations = reconcileBaseline(scoped([finding('scripts', 'partial', 'capture:screenshots', PLUGIN_COUNT)]), {
      'enhanced/scripts/partial/capture:screenshots': entry(PLUGIN_COUNT - PAIR)
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('baseline-count-moved');
  });

  // The direction that is easy to forget: fixing a drift without deleting its justification leaves the
  // File describing a difference that no longer exists, which is the drift a pin table forbids.
  it('fails an entry whose drift has gone', () => {
    const violations = reconcileBaseline(scoped([]), { 'enhanced/scripts/missing/prepare': entry(PLUGIN_COUNT) });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('stale-baseline-entry');
  });
});

describe('findingKey', () => {
  it('files a finding under preset, dimension, kind and key, so an entry names all four', () => {
    expect(findingKey(finding('scripts', 'missing', 'build:clean', PLUGIN_COUNT), 'enhanced')).toBe('enhanced/scripts/missing/build:clean');
  });
});

/** A consensus in which `count` of {@link PLUGIN_COUNT} plugins carry `key` under `layout`. */
function divided(count: number, key: string): ReturnType<typeof buildConsensus> {
  const profiles = Array.from({ length: PLUGIN_COUNT }, (_unused, index) => index < count ? profile({ layout: { [key]: '' } }) : profile({}));
  return buildConsensus(profiles);
}

function entry(pluginCount: number): BaselineEntry {
  return { pluginCount, why: 'Recorded for the test.' };
}

function finding(dimension: DriftDimension, kind: DriftFinding['kind'], key: string, pluginCount: number): DriftFinding {
  return {
    dimension,
    generatedValue: null,
    key,
    kind,
    pluginCount,
    pluginTotal: PLUGIN_COUNT,
    pluginValue: ''
  };
}

function profile(traits: Partial<Record<DriftDimension, Record<string, string>>>): ProjectProfile {
  const entries = Object.entries(traits) as [DriftDimension, Record<string, string>][];
  return new Map(entries.map(([dimension, keys]) => [dimension, new Map(Object.entries(keys))]));
}

/** The findings of a single `enhanced` run, which is the scope every reconciliation test but one uses. */
function scoped(findings: readonly DriftFinding[]): ReadonlyMap<string, readonly DriftFinding[]> {
  return new Map([['enhanced', findings]]);
}

/** A consensus in which all {@link PLUGIN_COUNT} plugins carry every given script. */
function unanimous(scripts: Record<string, string>): ReturnType<typeof buildConsensus> {
  return buildConsensus(Array.from({ length: PLUGIN_COUNT }, () => profile({ scripts })));
}
