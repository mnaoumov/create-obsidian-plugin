import type {
  Answers,
  StringAnswerKey
} from './answers.ts';
import type { FeatureOption } from './feature-option.ts';

import { API_SUBSET_OPTIONS } from './features/api-subset/index.ts';
import { BUNDLER_OPTIONS } from './features/bundler/index.ts';
import { COMMIT_LINTING_OPTIONS } from './features/commit-linting/index.ts';
import { E2E_TEST_RUNNER_OPTIONS } from './features/e2e-test-runner/index.ts';
import { EDITOR_EXTENSIONS_OPTIONS } from './features/editor-extensions/index.ts';
import { FORMATTER_OPTIONS } from './features/formatter/index.ts';
import { GITHUB_ACTIONS_OPTIONS } from './features/git-hub-actions/index.ts';
import { GITHUB_FUNDING_OPTIONS } from './features/git-hub-funding/index.ts';
import { GITHUB_ISSUE_TEMPLATES_OPTIONS } from './features/git-hub-issue-templates/index.ts';
import { HOT_RELOAD_OPTIONS } from './features/hot-reload/index.ts';
import { INTERNATIONALIZATION_OPTIONS } from './features/internationalization/index.ts';
import { LINTER_OPTIONS } from './features/linter/index.ts';
import { MARKDOWN_LINTER_OPTIONS } from './features/markdown-linter/index.ts';
import { PACKAGE_MANAGER_OPTIONS } from './features/package-manager/index.ts';
import { PLATFORM_SUPPORT_OPTIONS } from './features/platform-support/index.ts';
import { PRESET_OPTIONS } from './features/preset/index.ts';
import { SPELL_CHECKER_OPTIONS } from './features/spell-checker/index.ts';
import { STYLING_OPTIONS } from './features/styling/index.ts';
import { TEST_RUNNER_OPTIONS } from './features/test-runner/index.ts';
import { UI_FRAMEWORK_OPTIONS } from './features/ui-framework/index.ts';
import { WASM_SUPPORT_OPTIONS } from './features/wasm-support/index.ts';

/** One question of the generator's answer space: the answer it fills in, and every value it accepts. */
export interface AnswerDimension {
  /** The {@link Answers} key this question writes. */
  answerKey: StringAnswerKey;
  /** Every `settingValue` the question accepts, in the order the option array declares them. */
  values: readonly string[];
}

/**
 * Every question the generator asks, derived from the feature option arrays themselves.
 *
 * Derived rather than hand-listed so that adding an option to any `src/features/<question>/index.ts`
 * widens the verified space automatically -- a hand-written copy would silently stop covering the new
 * value. This is deliberately NOT `FEATURE_REGISTRIES` (`src/templates.ts`): that list is only the
 * questions whose options contribute a partial, and a question missing from it is exactly the defect
 * class the plan-level checks exist to catch.
 */
export const ANSWER_SPACE: readonly AnswerDimension[] = [
  toDimension('apiSubset', API_SUBSET_OPTIONS),
  toDimension('bundler', BUNDLER_OPTIONS),
  toDimension('commitLinting', COMMIT_LINTING_OPTIONS),
  toDimension('e2eTestRunner', E2E_TEST_RUNNER_OPTIONS),
  toDimension('editorExtensions', EDITOR_EXTENSIONS_OPTIONS),
  toDimension('formatter', FORMATTER_OPTIONS),
  toDimension('gitHubActions', GITHUB_ACTIONS_OPTIONS),
  toDimension('gitHubFunding', GITHUB_FUNDING_OPTIONS),
  toDimension('gitHubIssueTemplates', GITHUB_ISSUE_TEMPLATES_OPTIONS),
  toDimension('hotReload', HOT_RELOAD_OPTIONS),
  toDimension('internationalization', INTERNATIONALIZATION_OPTIONS),
  toDimension('linter', LINTER_OPTIONS),
  toDimension('markdownLinter', MARKDOWN_LINTER_OPTIONS),
  toDimension('packageManager', PACKAGE_MANAGER_OPTIONS),
  toDimension('platformSupport', PLATFORM_SUPPORT_OPTIONS),
  toDimension('preset', PRESET_OPTIONS),
  toDimension('spellChecker', SPELL_CHECKER_OPTIONS),
  toDimension('styling', STYLING_OPTIONS),
  toDimension('testRunner', TEST_RUNNER_OPTIONS),
  toDimension('uiFramework', UI_FRAMEWORK_OPTIONS),
  toDimension('wasmSupport', WASM_SUPPORT_OPTIONS)
];

/** How many distinct answer combinations {@link ANSWER_SPACE} describes. */
export const ANSWER_SPACE_SIZE = ANSWER_SPACE.reduce((size, dimension) => size * dimension.values.length, 1);

/** Value counts per dimension, in {@link ANSWER_SPACE} order -- the input a covering array needs. */
export const ANSWER_SPACE_DIMENSION_SIZES: readonly number[] = ANSWER_SPACE.map((dimension) => dimension.values.length);

const VERIFICATION_CURRENT_YEAR = 2026;

/**
 * The non-question answers, held fixed across every verified case.
 *
 * They are free text rather than a choice, so varying them cannot change which templates or partials a
 * case pulls in -- only what gets substituted into them.
 */
const FIXED_ANSWERS = {
  authorGitHubName: 'testuser',
  authorName: 'Test User',
  currentYear: VERIFICATION_CURRENT_YEAR,
  defaultBranch: 'main',
  fundingUrl: '',
  obsidianConfigFolder: '',
  pluginDescription: 'A generated plugin.',
  pluginId: 'my-plugin',
  pluginName: 'My Plugin',
  pluginShortName: 'MyPlugin'
} as const;

/**
 * Decodes an ordinal in `[0, {@link ANSWER_SPACE_SIZE})` into the answer combination it names.
 *
 * A mixed-radix decode, so a sweep can shard by ordinal without building out the cross-product, and any
 * failing case can be reported as a single number that reproduces it exactly.
 */
export function answersAtOrdinal(ordinal: number, overrides: Partial<Answers> = {}): Answers {
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= ANSWER_SPACE_SIZE) {
    throw new RangeError(`Ordinal ${String(ordinal)} is outside the answer space of ${String(ANSWER_SPACE_SIZE)} combinations.`);
  }

  const valueIndices: number[] = [];
  let remaining = ordinal;
  for (const dimension of ANSWER_SPACE) {
    valueIndices.push(remaining % dimension.values.length);
    remaining = Math.floor(remaining / dimension.values.length);
  }

  return answersFromValueIndices(valueIndices, overrides);
}

/** Builds the answers named by one value index per {@link ANSWER_SPACE} dimension, in dimension order. */
export function answersFromValueIndices(valueIndices: readonly number[], overrides: Partial<Answers> = {}): Answers {
  if (valueIndices.length !== ANSWER_SPACE.length) {
    throw new RangeError(`Expected ${String(ANSWER_SPACE.length)} value indices, got ${String(valueIndices.length)}.`);
  }

  const chosen: Partial<Record<StringAnswerKey, string>> = {};
  for (const [dimensionIndex, dimension] of ANSWER_SPACE.entries()) {
    const value = dimension.values[valueIndices[dimensionIndex] ?? -1];
    if (value === undefined) {
      throw new RangeError(`Value index ${String(valueIndices[dimensionIndex])} is out of range for question "${dimension.answerKey}".`);
    }
    chosen[dimension.answerKey] = value;
  }

  return makeAnswers({ ...chosen, ...overrides });
}

/** Names the answer combination in the compact `question=value` form a failure report can be read from. */
export function describeCase(answers: Answers): string {
  return ANSWER_SPACE.map((dimension) => `${dimension.answerKey}=${answers[dimension.answerKey]}`).join(' ');
}

/** Finds the dimension answering the given key, for the checks that need one question's value list. */
export function findDimension(answerKey: StringAnswerKey): AnswerDimension {
  const dimension = ANSWER_SPACE.find((candidate) => candidate.answerKey === answerKey);
  if (!dimension) {
    throw new Error(`No answer-space dimension for "${answerKey}".`);
  }
  return dimension;
}

/** Builds a complete {@link Answers} from the fixed non-question answers plus the given choices. */
export function makeAnswers(overrides: Partial<Answers> = {}): Answers {
  const defaults: Partial<Record<StringAnswerKey, string>> = {};
  for (const dimension of ANSWER_SPACE) {
    const [firstValue] = dimension.values;
    if (firstValue === undefined) {
      throw new Error(`Question "${dimension.answerKey}" declares no values.`);
    }
    defaults[dimension.answerKey] = firstValue;
  }

  return {
    ...FIXED_ANSWERS,
    ...defaults,
    ...overrides
  } as Answers;
}

function toDimension(answerKey: StringAnswerKey, options: readonly FeatureOption[]): AnswerDimension {
  return {
    answerKey,
    values: options.map((option) => option.settingValue)
  };
}
