/* eslint-disable no-magic-numbers -- A covering array is defined by small integers: dimension sizes, value
   indices and combination counts. Naming each one would replace the arithmetic that makes an expectation
   checkable (`2 * 3 + 2 * 4 + 3 * 4`) with opaque identifiers. Same call as `scripts/eslint.config.ts`. */

import {
  describe,
  expect,
  it
} from 'vitest';

import { ANSWER_SPACE_DIMENSION_SIZES } from './answer-space.ts';
import {
  buildCoveringArray,
  countCombinations,
  findUncoveredCombinations
} from './covering-array.ts';

describe('countCombinations', () => {
  it('counts every value of every dimension at strength 1', () => {
    expect(countCombinations([2, 3, 4], 1)).toBe(9);
  });

  it('counts every value pair of every dimension pair at strength 2', () => {
    expect(countCombinations([2, 3, 4], 2)).toBe(2 * 3 + 2 * 4 + 3 * 4);
  });

  it('counts the whole cross-product when the strength is the dimension count', () => {
    expect(countCombinations([2, 3, 4], 3)).toBe(2 * 3 * 4);
  });
});

describe('buildCoveringArray', () => {
  const SMALL_SPACE = [2, 3, 3, 4];

  it('covers every single value at strength 1', () => {
    const cases = buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 1 });
    expect(findUncoveredCombinations(cases, SMALL_SPACE, 1)).toEqual([]);
  });

  it('covers every value pair at strength 2', () => {
    const cases = buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 2 });
    expect(findUncoveredCombinations(cases, SMALL_SPACE, 2)).toEqual([]);
  });

  it('covers every value triple at strength 3', () => {
    const cases = buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 3 });
    expect(findUncoveredCombinations(cases, SMALL_SPACE, 3)).toEqual([]);
  });

  it('reaches the whole cross-product when the strength is the dimension count', () => {
    const cases = buildCoveringArray({ dimensionSizes: [2, 3], strength: 2 });
    expect(cases).toHaveLength(2 * 3);
  });

  // The largest product of any `t` dimension sizes is a hard lower bound: those two dimensions alone
  // Have that many pairs, and one case covers exactly one of them.
  it('lands near the lower bound rather than merely terminating', () => {
    const cases = buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 2 });
    const lowerBound = 3 * 4;
    expect(cases.length).toBeGreaterThanOrEqual(lowerBound);
    expect(cases.length).toBeLessThanOrEqual(lowerBound * 2);
  });

  it('keeps every required case, and counts what it already covers', () => {
    const required = [
      [1, 2, 2, 3],
      [0, 0, 0, 0]
    ];
    const cases = buildCoveringArray({ dimensionSizes: SMALL_SPACE, requiredCases: required, strength: 2 });
    expect(cases[0]).toEqual(required[0]);
    expect(cases[1]).toEqual(required[1]);
    expect(findUncoveredCombinations(cases, SMALL_SPACE, 2)).toEqual([]);
  });

  // Shards and failure reports are addressed by position, so two runs must agree on what position 7 is.
  it('is deterministic', () => {
    const first = buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 2 });
    const second = buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 2 });
    expect(first).toEqual(second);
  });

  it('rejects a strength outside the dimension count', () => {
    expect(() => buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: 0 })).toThrow(RangeError);
    expect(() => buildCoveringArray({ dimensionSizes: SMALL_SPACE, strength: SMALL_SPACE.length + 1 })).toThrow(RangeError);
  });

  it('rejects a required case that does not fit the space', () => {
    expect(() => buildCoveringArray({ dimensionSizes: SMALL_SPACE, requiredCases: [[0, 0]], strength: 2 })).toThrow(RangeError);
    expect(() => buildCoveringArray({ dimensionSizes: SMALL_SPACE, requiredCases: [[0, 0, 0, 9]], strength: 2 })).toThrow(RangeError);
  });

  describe('over the generator answer space', () => {
    it('covers every answer pair in a few dozen cases', () => {
      const cases = buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength: 2 });
      expect(findUncoveredCombinations(cases, ANSWER_SPACE_DIMENSION_SIZES, 2)).toEqual([]);
      // `uiFramework` (7) x `styling` (6) is the hard floor; anything past twice it is a construction bug.
      const lowerBound = 7 * 6;
      expect(cases.length).toBeGreaterThanOrEqual(lowerBound);
      expect(cases.length).toBeLessThanOrEqual(lowerBound * 2);
    });
  });
});

/* eslint-enable no-magic-numbers -- Re-enable after the covering array fixtures. */
