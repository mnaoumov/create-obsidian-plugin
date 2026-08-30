import {
  describe,
  expect,
  it
} from 'vitest';

import {
  ANSWER_SPACE,
  ANSWER_SPACE_DIMENSION_SIZES,
  ANSWER_SPACE_SIZE,
  answersAtOrdinal,
  answersFromValueIndices,
  describeCase,
  findDimension,
  makeAnswers
} from './answer-space.ts';
import { PLATFORM_SUPPORT_OPTIONS } from './features/platform-support/index.ts';

describe('ANSWER_SPACE', () => {
  const DIMENSION_COUNT = 23;
  const CHOICE_QUESTION_COUNT = 21;
  const CHOICE_QUESTION_SPACE_SIZE = 3_762_339_840;
  const PRESENCE_BRANCHES = ['fundingUrl', 'obsidianConfigFolder'];
  const PRESENCE_BRANCH_VALUE_COUNT = 2;
  const EXPECTED_ANSWER_SPACE_SIZE = CHOICE_QUESTION_SPACE_SIZE * PRESENCE_BRANCH_VALUE_COUNT ** PRESENCE_BRANCHES.length;
  const OUT_OF_RANGE_VALUE_INDEX = 99;
  const NON_INTEGER_ORDINAL = 1.5;
  const FIXED_ANSWER_COUNT = 8;

  it('has one dimension per choice question, plus the two presence branches', () => {
    expect(ANSWER_SPACE).toHaveLength(DIMENSION_COUNT);
    expect(DIMENSION_COUNT - PRESENCE_BRANCHES.length).toBe(CHOICE_QUESTION_COUNT);
  });

  // The two free-text answers are a branch, not decoration: `buildTemplate` contributes `has-funding`
  // And `has-vault-true`/`has-vault-false` on nothing but whether they are empty. A space without them
  // Reports those three partials as unreachable, which says nothing about the templates.
  it('branches on whether the two free-text answers were given', () => {
    for (const answerKey of PRESENCE_BRANCHES) {
      expect(findDimension(answerKey as 'fundingUrl').values[0]).toBe('');
      expect(findDimension(answerKey as 'fundingUrl').values).toHaveLength(PRESENCE_BRANCH_VALUE_COUNT);
    }
  });

  it('reports the size as the product of every dimension', () => {
    const expected = ANSWER_SPACE_DIMENSION_SIZES.reduce((product, size) => product * size, 1);
    expect(ANSWER_SPACE_SIZE).toBe(expected);
    // Stated outright so a question quietly gained or lost is a failing assertion, not a silent reshape.
    expect(ANSWER_SPACE_SIZE).toBe(EXPECTED_ANSWER_SPACE_SIZE);
  });

  it('stays inside the exactly-representable integer range, which sharding by ordinal relies on', () => {
    expect(Number.isSafeInteger(ANSWER_SPACE_SIZE)).toBe(true);
  });

  it('gives every dimension at least two distinct values', () => {
    for (const dimension of ANSWER_SPACE) {
      expect(dimension.values.length, `${dimension.answerKey} should offer a choice`).toBeGreaterThan(1);
      expect(new Set(dimension.values).size, `${dimension.answerKey} should not repeat a value`).toBe(dimension.values.length);
    }
  });

  it('names each dimension by a distinct answer key', () => {
    const keys = ANSWER_SPACE.map((dimension) => dimension.answerKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // The two questions absent from `FEATURE_REGISTRIES` are exactly the ones a hand-written list would
  // Have copied from it -- and copying it is how `platformSupport` came to be prompted for and discarded.
  it('includes the questions that contribute no partial through FEATURE_REGISTRIES', () => {
    const keys = ANSWER_SPACE.map((dimension) => dimension.answerKey);
    expect(keys).toContain('packageManager');
    expect(keys).toContain('platformSupport');
  });

  it('takes its values from the feature option arrays themselves', () => {
    expect(findDimension('platformSupport').values).toEqual(PLATFORM_SUPPORT_OPTIONS.map((option) => option.settingValue));
  });

  it('throws for a key no dimension answers', () => {
    expect(() => findDimension('pluginId')).toThrow();
  });

  describe('makeAnswers', () => {
    it('fills every answer, with no gaps for a template to render as undefined', () => {
      const answers = makeAnswers();
      expect(Object.keys(answers)).toHaveLength(DIMENSION_COUNT + FIXED_ANSWER_COUNT);
      for (const [key, value] of Object.entries(answers)) {
        expect(value, `${key} should be answered`).not.toBeUndefined();
      }
    });

    it('defaults each question to its first declared option', () => {
      const answers = makeAnswers();
      for (const dimension of ANSWER_SPACE) {
        expect(answers[dimension.answerKey]).toBe(dimension.values[0]);
      }
    });

    it('applies overrides over the defaults', () => {
      expect(makeAnswers({ preset: 'demo' }).preset).toBe('demo');
    });
  });

  describe('answersAtOrdinal', () => {
    it('decodes ordinal 0 as the first value of every question', () => {
      const answers = answersAtOrdinal(0);
      for (const dimension of ANSWER_SPACE) {
        expect(answers[dimension.answerKey]).toBe(dimension.values[0]);
      }
    });

    it('decodes the last ordinal as the last value of every question', () => {
      const answers = answersAtOrdinal(ANSWER_SPACE_SIZE - 1);
      for (const dimension of ANSWER_SPACE) {
        expect(answers[dimension.answerKey]).toBe(dimension.values.at(-1));
      }
    });

    it('gives a distinct combination per ordinal', () => {
      const STRIDE = 7_919_311;
      const SAMPLE_COUNT = 400;
      const seen = new Set<string>();
      for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
        seen.add(describeCase(answersAtOrdinal((sample * STRIDE) % ANSWER_SPACE_SIZE)));
      }
      expect(seen.size).toBe(SAMPLE_COUNT);
    });

    it('rejects an ordinal outside the space', () => {
      expect(() => answersAtOrdinal(-1)).toThrow(RangeError);
      expect(() => answersAtOrdinal(ANSWER_SPACE_SIZE)).toThrow(RangeError);
      expect(() => answersAtOrdinal(NON_INTEGER_ORDINAL)).toThrow(RangeError);
    });

    it('applies overrides over the decoded combination', () => {
      expect(answersAtOrdinal(0, { pluginId: 'other' }).pluginId).toBe('other');
    });
  });

  describe('answersFromValueIndices', () => {
    it('reads one value index per dimension, in dimension order', () => {
      const indices = ANSWER_SPACE.map(() => 0);
      const presetPosition = ANSWER_SPACE.findIndex((dimension) => dimension.answerKey === 'preset');
      indices[presetPosition] = 1;
      const answers = answersFromValueIndices(indices);
      expect(answers.preset).toBe(ANSWER_SPACE[presetPosition]?.values[1]);
    });

    it('rejects the wrong number of indices', () => {
      expect(() => answersFromValueIndices([0])).toThrow(RangeError);
    });

    it('rejects an index no such value exists at', () => {
      const indices = ANSWER_SPACE.map(() => OUT_OF_RANGE_VALUE_INDEX);
      expect(() => answersFromValueIndices(indices)).toThrow(RangeError);
    });
  });

  describe('describeCase', () => {
    it('names every question and its answer, so a failure reproduces from the report alone', () => {
      const described = describeCase(makeAnswers({ preset: 'demo' }));
      expect(described).toContain('preset=demo');
      expect(described.split(' ')).toHaveLength(ANSWER_SPACE.length);
    });
  });
});
