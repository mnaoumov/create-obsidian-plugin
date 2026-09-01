import {
  existsSync,
  readFileSync
} from 'node:fs';

import type {
  Answers,
  StringAnswerKey
} from './answers.ts';

import { ANSWER_SPACE } from './answer-space.ts';
import {
  getDefaultAnswers,
  validateNotEmpty,
  validatePluginDescription,
  validatePluginId
} from './prompts.ts';

export interface CliArgs {
  /** Every answer supplied on the command line or in `--answersFile`, with the flags winning. */
  answers: Partial<Answers>;
  showHelp: boolean;
  useDefaults: boolean;
}

/**
 * The {@link Answers} keys the generator computes rather than asks for, and which therefore cannot be
 * supplied.
 *
 * `currentYear` is `new Date().getFullYear()` and is the one numeric field; `pluginShortName` is derived
 * from `pluginId`. Naming either one is refused rather than ignored, because a flag that is silently
 * dropped is the same defect class as a question missing from `FEATURE_REGISTRIES` -- the user states an
 * intention and nothing carries it.
 */
export const COMPUTED_ANSWER_KEYS: readonly string[] = ['currentYear', 'pluginShortName'];

const ANSWERS_FILE_PREFIX = '--answersFile=';

/** The length of the leading `--` a flag name sits behind. */
const FLAG_PREFIX_LENGTH = 2;

/**
 * The validator each free-text answer has to pass, mirroring what its prompt already enforces.
 *
 * These run only inside the clack `text()` prompt today, so an answer that arrives any other way is
 * unchecked. Sharing them here is what stops the non-interactive path accepting a plugin id the
 * interactive path would have refused.
 *
 * `fundingUrl` and `obsidianConfigFolder` are deliberately absent: both are legitimately empty, and
 * their prompts declare no validator either.
 */
const FREE_TEXT_VALIDATORS: Partial<Record<StringAnswerKey, (value: string) => string | undefined>> = {
  authorGitHubName: validateNotEmpty,
  authorName: validateNotEmpty,
  defaultBranch: validateNotEmpty,
  pluginDescription: validatePluginDescription,
  pluginId: validatePluginId,
  pluginName: validateNotEmpty
};

/**
 * The two answers `preset: demo` pins in a way that DISCARDS a supplied value.
 *
 * Every other question honours one even when its prompt is skipped, because the skip branch writes
 * `defaultValue()` and each of those reads the supplied answer first. These two do not: their
 * `defaultValue` is `answers.get('preset') === 'demo' ? '<literal>' : (supplied ?? '<literal>')`.
 */
export const DEMO_PINNED_ANSWER_KEYS: readonly string[] = ['bundler', 'uiFramework'];

/**
 * Refuses an answer the generator cannot honour, naming what it accepts.
 *
 * Exported so `render:case` and `gate:case` validate exactly as the CLI does. They each carried their own
 * copy, and the two disagreed -- `gate-one-case.ts` checked the key and let any value through.
 */
export function assertValidAnswer(key: StringAnswerKey, value: string): void {
  const dimension = findChoiceDimension(key);
  if (dimension) {
    if (!dimension.values.includes(value)) {
      throw new Error(`"${value}" is not an answer to ${key}. It accepts: ${dimension.values.join(', ')}.`);
    }
    return;
  }

  const message = FREE_TEXT_VALIDATORS[key]?.(value);
  if (message !== undefined) {
    throw new Error(`"${value}" is not a valid ${key}. ${message}.`);
  }
}

/**
 * Every answer that can be supplied non-interactively, sorted.
 *
 * Read off a real {@link Answers} object rather than a hand-written list, so a question added later is
 * settable the day it lands. TypeScript forces `getDefaultAnswers` to return every key, which is what
 * makes this derivation total.
 */
export function getAnswerableKeys(): StringAnswerKey[] {
  return Object.keys(getDefaultAnswers())
    .filter((key) => !COMPUTED_ANSWER_KEYS.includes(key))
    .sort() as StringAnswerKey[];
}

/** The `--help` body, built from the same tables that validate, so it cannot describe a stale CLI. */
export function getHelpText(): string {
  const lines = [
    'Usage: npm create @mnaoumov/obsidian-plugin [-- <options>]',
    '',
    'Options:',
    '  -y, --yes                 Take every default and skip the post-scaffold prompts.',
    '  -h, --help                Show this help.',
    '      --answersFile=<path>  Read answers from a JSON file. Accepts a bare answers object or a',
    '                            `.create-obsidian-plugin.json`. Individual flags override it.',
    '',
    'Answers (any of these may be given as --<key>=<value>):'
  ];

  for (const key of getAnswerableKeys()) {
    const dimension = findChoiceDimension(key);
    lines.push(dimension ? `  --${key}=${dimension.values.join('|')}` : `  --${key}=<text>`);
  }

  return lines.join('\n');
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const flagAnswers: Partial<Record<StringAnswerKey, string>> = {};
  let answersFilePath: null | string = null;
  let showHelp = false;
  let useDefaults = false;

  for (const argument of argv) {
    if (argument === '--yes' || argument === '-y') {
      useDefaults = true;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      showHelp = true;
      continue;
    }

    if (argument.startsWith(ANSWERS_FILE_PREFIX)) {
      answersFilePath = argument.slice(ANSWERS_FILE_PREFIX.length);
      continue;
    }

    const [rawKey, value] = splitFlag(argument);
    const key = toAnswerKey(rawKey);
    assertValidAnswer(key, value);
    flagAnswers[key] = value;
  }

  const fileAnswers = answersFilePath === null ? {} : readAnswersFile(answersFilePath);
  const answers = { ...fileAnswers, ...flagAnswers };
  assertNoDemoConflict(answers);

  return {
    answers,
    showHelp,
    useDefaults
  };
}

/**
 * The typed answer key for a name, refusing one the generator does not ask for.
 *
 * A returned key rather than a TypeScript assertion, because an assertion function has to be declared
 * with an explicit type annotation at every call site that imports it, and `render:case` / `gate:case`
 * both consume this.
 */
export function toAnswerKey(key: string): StringAnswerKey {
  if (COMPUTED_ANSWER_KEYS.includes(key)) {
    throw new Error(`${key} is computed by the generator, not answered, so it cannot be set.`);
  }

  const answerable = getAnswerableKeys();
  if (!answerable.includes(key as StringAnswerKey)) {
    throw new Error(`Unknown answer "${key}". The answers are: ${answerable.join(', ')}.`);
  }

  return key as StringAnswerKey;
}

/**
 * Refuses `preset=demo` alongside an answer demo pins, instead of accepting a flag it would then drop.
 *
 * Letting the flag through would be worse than dropping it: T735-P42 established that demo emits a
 * project that CANNOT BUILD when a second JSX runtime is forced in beside react, and closed that on the
 * grounds that the combination is unreachable from every CLI path. A `--uiFramework` flag reaching it
 * would re-open exactly that defect.
 */
function assertNoDemoConflict(answers: Partial<Record<StringAnswerKey, string>>): void {
  if (answers.preset !== 'demo') {
    return;
  }

  for (const key of DEMO_PINNED_ANSWER_KEYS) {
    if (answers[key as StringAnswerKey] !== undefined) {
      throw new Error(`preset=demo pins ${key}, so the two cannot be given together. Drop --${key}, or choose another preset.`);
    }
  }
}

/**
 * The dimension for a key whose answers are a closed set, or `null` where the answer is free text.
 *
 * A dimension carrying `''` is a presence branch -- `fundingUrl` and `obsidianConfigFolder` are free text
 * modelled with one empty and one sample value purely so the sweeps reach both partials. Holding a caller
 * to those two literals would enforce an artefact of the modelling rather than a real constraint.
 */
function findChoiceDimension(key: StringAnswerKey): null | typeof ANSWER_SPACE[number] {
  const dimension = ANSWER_SPACE.find((candidate) => candidate.answerKey === key);
  if (!dimension || dimension.values.includes('')) {
    return null;
  }
  return dimension;
}

/**
 * Reads `--answersFile`, accepting either a bare answers object or a whole `.create-obsidian-plugin.json`.
 *
 * Taking the wrapped form too means the file can be pointed straight at an existing project to scaffold
 * another one like it. That file records `currentYear` and `pluginShortName`, so a computed key found
 * HERE is skipped rather than refused -- unlike a flag, which is something the user typed on purpose.
 */
function readAnswersFile(path: string): Partial<Record<StringAnswerKey, string>> {
  if (!existsSync(path)) {
    throw new Error(`Answers file not found: ${path}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    throw new Error(`Answers file is not valid JSON: ${path}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Answers file should contain a JSON object: ${path}`);
  }

  const record = parsed as Record<string, unknown>;
  const wrapped = record['answers'];
  const source = typeof wrapped === 'object' && wrapped !== null ? wrapped as Record<string, unknown> : record;

  const answers: Partial<Record<StringAnswerKey, string>> = {};
  for (const [rawKey, value] of Object.entries(source)) {
    if (COMPUTED_ANSWER_KEYS.includes(rawKey)) {
      continue;
    }

    if (typeof value !== 'string') {
      throw new Error(`${rawKey} in ${path} should be a string, got ${typeof value}.`);
    }

    const key = toAnswerKey(rawKey);
    assertValidAnswer(key, value);
    answers[key] = value;
  }

  return answers;
}

function splitFlag(argument: string): [string, string] {
  if (!argument.startsWith('--')) {
    throw new Error(`Expected --<answer>=<value>, got "${argument}".`);
  }

  const separatorIndex = argument.indexOf('=');
  if (separatorIndex === -1) {
    throw new Error(`Expected --<answer>=<value>, got "${argument}".`);
  }

  // `indexOf` rather than `split`, so a value containing `=` survives -- a funding URL can carry a query
  // String.
  return [argument.slice(FLAG_PREFIX_LENGTH, separatorIndex), argument.slice(separatorIndex + 1)];
}
