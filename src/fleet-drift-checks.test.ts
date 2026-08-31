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
} from './fleet-drift-checks.ts';

import {
  buildConsensus,
  compareToFleet,
  findingKey,
  FLEET_SHAPED_ANSWERS,
  fleetShapedAnswers,
  reconcileBaseline
} from './fleet-drift-checks.ts';

/** How many plugins a consensus fixture pretends to have profiled, chosen so halves are exact. */
const FLEET_SIZE = 10;

/** A pair and a triple, for the small fixtures whose expected counts are written out by hand. */
const PAIR = 2;

const TRIPLE = 3;

/** Exactly the partial-reporting floor of the fixture fleet, so the boundary can be tested on both sides. */
const HALF_FLEET = FLEET_SIZE / PAIR;

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
  // Or the same fleet produces a different baseline on a different machine.
  it('breaks a tie on the value, not on profile order', () => {
    const forwards = buildConsensus([profile({ scripts: { build: 'a' } }), profile({ scripts: { build: 'b' } })]);
    const backwards = buildConsensus([profile({ scripts: { build: 'b' } }), profile({ scripts: { build: 'a' } })]);

    expect(forwards.traits.get('scripts')?.get('build')?.value).toBe('a');
    expect(backwards.traits.get('scripts')?.get('build')?.value).toBe('a');
  });
});

describe('compareToFleet', () => {
  it('reports a unanimous trait the generator lacks as missing', () => {
    const findings = compareToFleet(unanimous({ 'build:clean': 'jiti scripts/build-clean.ts' }), profile({}));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('missing');
    expect(findings[0]?.fleetCount).toBe(FLEET_SIZE);
  });

  it('reports a unanimous trait whose value differs as differs, not as missing plus extra', () => {
    const findings = compareToFleet(unanimous({ build: 'jiti scripts/build.ts' }), profile({ scripts: { build: 'tsc' } }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('differs');
    expect(findings[0]?.generatedValue).toBe('tsc');
  });

  it('reports a trait no fleet plugin has as extra', () => {
    const findings = compareToFleet(unanimous({ build: 'jiti scripts/build.ts' }), profile({ scripts: { 'build': 'jiti scripts/build.ts', 'test:e2e': 'jiti scripts/test-e2e.ts' } }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('extra');
    expect(findings[0]?.key).toBe('test:e2e');
  });

  it('says nothing about a divided trait the generator already has', () => {
    expect(compareToFleet(divided(FLEET_SIZE - 1, 'capture-screenshots.ts'), profile({ layout: { 'capture-screenshots.ts': '' } }))).toEqual([]);
  });

  // A dimension the fleet has no trait in at all would otherwise never be scanned, so everything the
  // Generator emits under it would go unreported -- silently, which is the failure mode this whole
  // Verification design is shaped around.
  it('reports an extra in a dimension the fleet has nothing in', () => {
    const findings = compareToFleet(buildConsensus([profile({})]), profile({ workflows: { '.github/workflows/ci.yml': '' } }));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('extra');
    expect(findings[0]?.dimension).toBe('workflows');
  });

  it('reports a divided trait the generator lacks as partial, carrying the count as the evidence', () => {
    const findings = compareToFleet(divided(FLEET_SIZE - 1, 'capture:screenshots'), profile({}));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('partial');
    expect(findings[0]?.fleetCount).toBe(FLEET_SIZE - 1);
    expect(findings[0]?.fleetTotal).toBe(FLEET_SIZE);
  });

  // Without the floor this dimension is unusable rather than merely noisy: the first real run produced
  // 1793 findings, and all but a few dozen were one plugin's own demo-vault content at 1 of 29.
  it('stays silent about a trait a minority of the fleet carries', () => {
    expect(compareToFleet(divided(1, 'one-plugins-own-note.md'), profile({}))).toEqual([]);
    expect(compareToFleet(divided(HALF_FLEET - 1, 'nearly-half.md'), profile({}))).toEqual([]);
  });

  it('reports a trait exactly at the floor', () => {
    expect(compareToFleet(divided(HALF_FLEET, 'half.md'), profile({}))).toHaveLength(1);
  });
});

describe('fleetShapedAnswers', () => {
  it('carries every measured fleet answer through, and takes the preset from its argument', () => {
    const answers = fleetShapedAnswers('demo');

    expect(answers.preset).toBe('demo');
    expect(answers.bundler).toBe('esbuild');
    expect(answers.testRunner).toBe('vitest');
  });

  // The one answer that reads oddly, so it is asserted rather than left to a comment. No fleet plugin
  // Has a `ci.yml` or a `release.yml`; asking for them would report the generator's own CI workflows as
  // Drift the fleet chose not to have, and bury the finding that the one workflow all 29 DO ship is
  // Emitted by no answer at all.
  it('asks for no CI workflows, because no fleet plugin has one', () => {
    expect(FLEET_SHAPED_ANSWERS.gitHubActions).toBe('none');
  });
});

describe('reconcileBaseline', () => {
  it('fails a drift with no entry', () => {
    const violations = reconcileBaseline(scoped([finding('scripts', 'missing', 'prepare', FLEET_SIZE)]), {});

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('unbaselined-drift');
    expect(violations[0]?.key).toBe('enhanced/scripts/missing/prepare');
  });

  it('accepts a drift the baseline records at the same count', () => {
    expect(reconcileBaseline(scoped([finding('scripts', 'missing', 'prepare', FLEET_SIZE)]), {
      'enhanced/scripts/missing/prepare': entry(FLEET_SIZE)
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
  it('re-reports an entry whose fleet count has moved', () => {
    const violations = reconcileBaseline(scoped([finding('scripts', 'partial', 'capture:screenshots', FLEET_SIZE)]), {
      'enhanced/scripts/partial/capture:screenshots': entry(FLEET_SIZE - PAIR)
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('baseline-count-moved');
  });

  // The direction that is easy to forget: fixing a drift without deleting its justification leaves the
  // File describing a difference that no longer exists, which is the drift G100 forbids of a pin table.
  it('fails an entry whose drift has gone', () => {
    const violations = reconcileBaseline(scoped([]), { 'enhanced/scripts/missing/prepare': entry(FLEET_SIZE) });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe('stale-baseline-entry');
  });
});

describe('findingKey', () => {
  it('files a finding under preset, dimension, kind and key, so an entry names all four', () => {
    expect(findingKey(finding('scripts', 'missing', 'build:clean', FLEET_SIZE), 'enhanced')).toBe('enhanced/scripts/missing/build:clean');
  });
});

/** A consensus in which `count` of {@link FLEET_SIZE} plugins carry `key` under `layout`. */
function divided(count: number, key: string): ReturnType<typeof buildConsensus> {
  const profiles = Array.from({ length: FLEET_SIZE }, (_unused, index) => index < count ? profile({ layout: { [key]: '' } }) : profile({}));
  return buildConsensus(profiles);
}

function entry(fleetCount: number): BaselineEntry {
  return { fleetCount, why: 'Recorded for the test.' };
}

function finding(dimension: DriftDimension, kind: DriftFinding['kind'], key: string, fleetCount: number): DriftFinding {
  return {
    dimension,
    fleetCount,
    fleetTotal: FLEET_SIZE,
    fleetValue: '',
    generatedValue: null,
    key,
    kind
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

/** A consensus in which all {@link FLEET_SIZE} plugins carry every given script. */
function unanimous(scripts: Record<string, string>): ReturnType<typeof buildConsensus> {
  return buildConsensus(Array.from({ length: FLEET_SIZE }, () => profile({ scripts })));
}
