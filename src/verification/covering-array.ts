/** A combination of one value per named dimension -- what a covering array has to place in some case. */
export interface CombinationConstraint {
  dimensions: number[];
  values: number[];
}

/** What {@link buildCoveringArray} needs: the shape of the space, and how strongly to cover it. */
export interface CoveringArrayParams {
  /** How many values each dimension has, in dimension order. */
  dimensionSizes: readonly number[];
  /** Cases that must appear in the result, each one value index per dimension. */
  requiredCases?: readonly (readonly number[])[] | undefined;
  /** Every combination of this many dimensions' values appears in at least one returned case. */
  strength: number;
}

interface Candidate {
  newlyCovered: number;
  values: number[];
}

/**
 * The dimension subsets a covering array has to satisfy, in the two shapes the construction reads them.
 *
 * `subsets` is the flat list, walked once per committed case; `byDimension` indexes the same subsets by
 * each dimension they contain, because scoring a value only ever looks at subsets containing it.
 */
interface CombinationIndex {
  byDimension: number[][][];
  subsets: number[][];
}

/**
 * How many candidate cases to build per round before committing the best one.
 *
 * Each candidate assigns the dimensions in a different rotation, and the greedy value choice depends on
 * that order -- so trying a handful and keeping the best is what keeps the array near its lower bound.
 * More candidates buy progressively less: the difference between 8 and 32 is a case or two.
 */
const CANDIDATE_ROTATIONS = 8;

/**
 * Builds a strength-`t` covering array over the given space.
 *
 * A greedy one-row-at-a-time construction (AETG-style): each round seeds a case with a still-uncovered
 * combination, builds {@link CANDIDATE_ROTATIONS} candidates that fill the remaining dimensions in
 * different orders -- each picking the value that newly covers the most -- and keeps the best.
 * Deterministic, so shards and failure reports reproduce exactly.
 *
 * The result is near-minimal, not provably minimal: the hard lower bound is the largest product of any
 * `t` dimension sizes, and this lands within a few cases of it in practice.
 */
export function buildCoveringArray(params: CoveringArrayParams): number[][] {
  const {
    dimensionSizes,
    requiredCases = [],
    strength
  } = params;

  assertValidParams(dimensionSizes, strength);

  const index = buildCombinationIndex(dimensionSizes, strength);
  const uncovered = collectAllCombinations(dimensionSizes, index);
  const cases: number[][] = [];

  for (const requiredCase of requiredCases) {
    assertValidCase(requiredCase, dimensionSizes);
    const copied = [...requiredCase];
    cases.push(copied);
    markCovered(copied, index, uncovered);
  }

  const order = [...dimensionSizes.keys()].sort((a, b) => (dimensionSizes[b] ?? 0) - (dimensionSizes[a] ?? 0));

  while (uncovered.size > 0) {
    const best = pickBestCandidate(order, dimensionSizes, index, uncovered);
    if (best.newlyCovered === 0) {
      throw new Error(`Greedy construction stalled with ${String(uncovered.size)} combinations uncovered.`);
    }
    cases.push(best.values);
    markCovered(best.values, index, uncovered);
  }

  return cases;
}

/** How many strength-`t` value combinations the space contains -- the total a covering array must reach. */
export function countCombinations(dimensionSizes: readonly number[], strength: number): number {
  let total = 0;
  for (const dimensions of enumerateSubsets(dimensionSizes.length, strength)) {
    total += dimensions.reduce((product, dimension) => product * (dimensionSizes[dimension] ?? 0), 1);
  }
  return total;
}

/** Lists the strength-`t` combinations the given cases leave uncovered, for asserting an array is valid. */
export function findUncoveredCombinations(cases: readonly (readonly number[])[], dimensionSizes: readonly number[], strength: number): string[] {
  const index = buildCombinationIndex(dimensionSizes, strength);
  const uncovered = collectAllCombinations(dimensionSizes, index);
  for (const oneCase of cases) {
    markCovered(oneCase, index, uncovered);
  }
  return [...uncovered];
}

/** Reads a combination key back into the dimensions it constrains and the values it holds them at. */
export function parseCombinationKey(key: string): CombinationConstraint {
  const dimensions: number[] = [];
  const values: number[] = [];
  for (const part of key.split(';')) {
    if (part === '') {
      continue;
    }
    const [dimension, value] = part.split(':');
    dimensions.push(Number(dimension));
    values.push(Number(value));
  }
  return { dimensions, values };
}

function assertValidCase(oneCase: readonly number[], dimensionSizes: readonly number[]): void {
  if (oneCase.length !== dimensionSizes.length) {
    throw new RangeError(`Required case has ${String(oneCase.length)} values, expected ${String(dimensionSizes.length)}.`);
  }
  for (const [dimension, value] of oneCase.entries()) {
    const size = dimensionSizes[dimension] ?? 0;
    if (value < 0 || value >= size) {
      throw new RangeError(`Required case value ${String(value)} is out of range for dimension ${String(dimension)} of size ${String(size)}.`);
    }
  }
}

function assertValidParams(dimensionSizes: readonly number[], strength: number): void {
  if (strength < 1 || strength > dimensionSizes.length) {
    throw new RangeError(`Strength ${String(strength)} is outside 1..${String(dimensionSizes.length)}.`);
  }
  if (dimensionSizes.some((size) => size < 1)) {
    throw new RangeError('Every dimension must have at least one value.');
  }
}

function buildCandidate(
  order: readonly number[],
  seed: CombinationConstraint,
  dimensionSizes: readonly number[],
  index: CombinationIndex,
  uncovered: ReadonlySet<string>
): Candidate {
  const values: number[] = dimensionSizes.map(() => 0);
  const assigned = new Set<number>();

  for (const [position, dimension] of seed.dimensions.entries()) {
    values[dimension] = seed.values[position] ?? 0;
    assigned.add(dimension);
  }

  for (const dimension of order) {
    if (assigned.has(dimension)) {
      continue;
    }
    values[dimension] = pickBestValue(dimension, values, assigned, dimensionSizes, index, uncovered);
    assigned.add(dimension);
  }

  return { newlyCovered: countNewlyCovered(values, index, uncovered), values };
}

function buildCombinationIndex(dimensionSizes: readonly number[], strength: number): CombinationIndex {
  const subsets = enumerateSubsets(dimensionSizes.length, strength);
  const byDimension: number[][][] = dimensionSizes.map(() => []);
  for (const dimensions of subsets) {
    for (const dimension of dimensions) {
      byDimension[dimension]?.push(dimensions);
    }
  }
  return { byDimension, subsets };
}

function collectAllCombinations(dimensionSizes: readonly number[], index: CombinationIndex): Set<string> {
  const all = new Set<string>();
  for (const dimensions of index.subsets) {
    const sizes = dimensions.map((dimension) => dimensionSizes[dimension] ?? 0);
    for (const values of enumerateValueTuples(sizes)) {
      all.add(combinationKey(dimensions, values));
    }
  }
  return all;
}

function combinationKey(dimensions: readonly number[], values: readonly number[]): string {
  let key = '';
  for (const [index, dimension] of dimensions.entries()) {
    key += `${String(dimension)}:${String(values[index])};`;
  }
  return key;
}

function countNewlyCovered(values: readonly number[], index: CombinationIndex, uncovered: ReadonlySet<string>): number {
  let count = 0;
  for (const dimensions of index.subsets) {
    if (uncovered.has(combinationKey(dimensions, dimensions.map((dimension) => values[dimension] ?? 0)))) {
      count++;
    }
  }
  return count;
}

/** Every combination of `size` dimension indices out of `count`, each ascending, in lexicographic order. */
function enumerateSubsets(count: number, size: number): number[][] {
  const subsets: number[][] = [];
  const current: number[] = [];

  function walk(start: number): void {
    if (current.length === size) {
      subsets.push([...current]);
      return;
    }
    for (let dimension = start; dimension < count; dimension++) {
      current.push(dimension);
      walk(dimension + 1);
      current.pop();
    }
  }

  walk(0);
  return subsets;
}

function enumerateValueTuples(sizes: readonly number[]): number[][] {
  let tuples: number[][] = [[]];
  for (const size of sizes) {
    const grown: number[][] = [];
    for (const tuple of tuples) {
      for (let value = 0; value < size; value++) {
        grown.push([...tuple, value]);
      }
    }
    tuples = grown;
  }
  return tuples;
}

function markCovered(values: readonly number[], index: CombinationIndex, uncovered: Set<string>): void {
  for (const dimensions of index.subsets) {
    uncovered.delete(combinationKey(dimensions, dimensions.map((dimension) => values[dimension] ?? 0)));
  }
}

/**
 * Builds several candidate cases for this round and returns the one covering the most.
 *
 * Every candidate is **seeded** with a still-uncovered combination rather than started from nothing: a
 * purely greedy candidate ties at zero gain once the easy combinations are gone, rebuilds the case it
 * built last round, and the construction stalls with combinations left over. Seeding guarantees each
 * committed case covers at least the combination it was seeded from, which is what makes the loop
 * terminate.
 */
function pickBestCandidate(
  order: readonly number[],
  dimensionSizes: readonly number[],
  index: CombinationIndex,
  uncovered: ReadonlySet<string>
): Candidate {
  const [seedKey] = uncovered;
  if (seedKey === undefined) {
    throw new Error('No uncovered combination to seed a candidate from.');
  }

  const seed = parseCombinationKey(seedKey);
  const rotations = Math.min(CANDIDATE_ROTATIONS, order.length);
  let best: Candidate | null = null;

  for (let rotation = 0; rotation < rotations; rotation++) {
    const rotated = order.map((_dimension, position) => order[(position + rotation) % order.length] ?? 0);
    const candidate = buildCandidate(rotated, seed, dimensionSizes, index, uncovered);
    if (!best || candidate.newlyCovered > best.newlyCovered) {
      best = candidate;
    }
  }

  if (!best) {
    throw new Error('No candidate could be built for a non-empty dimension order.');
  }
  return best;
}

/** Picks the value for one dimension that newly covers the most combinations with what is already fixed. */
function pickBestValue(
  dimension: number,
  values: readonly number[],
  assigned: ReadonlySet<number>,
  dimensionSizes: readonly number[],
  index: CombinationIndex,
  uncovered: ReadonlySet<string>
): number {
  // Only subsets whose other members are already assigned can be scored -- the rest have no value yet.
  const relevantSubsets = (index.byDimension[dimension] ?? []).filter((dimensions) => dimensions.every((member) => member === dimension || assigned.has(member)));
  const size = dimensionSizes[dimension] ?? 1;

  let bestValue = 0;
  let bestGain = -1;

  for (let value = 0; value < size; value++) {
    let gain = 0;
    for (const dimensions of relevantSubsets) {
      const key = combinationKey(dimensions, dimensions.map((member) => (member === dimension ? value : (values[member] ?? 0))));
      if (uncovered.has(key)) {
        gain++;
      }
    }
    if (gain > bestGain) {
      bestGain = gain;
      bestValue = value;
    }
  }

  return bestValue;
}
