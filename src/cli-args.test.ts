import {
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  describe,
  expect,
  it
} from 'vitest';

import { ANSWER_SPACE } from './answer-space.ts';
import {
  COMPUTED_ANSWER_KEYS,
  getAnswerableKeys,
  getHelpText,
  parseCliArgs
} from './cli-args.ts';
import { getDefaultAnswers } from './prompts.ts';

const PRESENCE_BRANCH_KEYS = ['fundingUrl', 'obsidianConfigFolder'];

/** A `currentYear` as a saved config records it -- the value a computed key is skipped rather than read from. */
const SAVED_CURRENT_YEAR = 2026;

/** Any non-string, to prove an answers file is refused rather than coerced. */
const NOT_A_STRING = 42;

/** A JSON array, to prove the answers file has to be an object. */
const NOT_AN_OBJECT = ['linter', 'biome'];

const tempDir = mkdtempSync(join(tmpdir(), 'cop-cli-args-'));

afterAll(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

function writeAnswersFile(name: string, content: unknown): string {
  const path = join(tempDir, name);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content) ?? '');
  return path;
}

describe('the answerable-key surface', () => {
  // The defect this pins is the one `platformSupport` shipped: a question the user is asked whose answer
  // Is then discarded. A hand-written key list would silently stop covering a question added later, so
  // The set is read off a real `Answers` and every key has to be accounted for on one side or the other.
  it('accounts for every Answers key as either answerable or computed', () => {
    const allKeys = Object.keys(getDefaultAnswers()).sort();
    const covered = [...getAnswerableKeys(), ...COMPUTED_ANSWER_KEYS].sort();
    expect(covered).toStrictEqual(allKeys);
  });

  it('treats exactly the two presence branches as free text, not as closed choices', () => {
    const withEmptyValue = ANSWER_SPACE
      .filter((dimension) => dimension.values.includes(''))
      .map((dimension) => dimension.answerKey)
      .sort();
    expect(withEmptyValue).toStrictEqual(PRESENCE_BRANCH_KEYS);
  });

  it('lists every answerable key in --help, with the closed sets spelled out', () => {
    const help = getHelpText();
    for (const key of getAnswerableKeys()) {
      expect(help).toContain(`--${key}=`);
    }
    expect(help).toContain('--bundler=esbuild|parcel|rollup|vite|webpack');
    expect(help).toContain('--pluginId=<text>');
  });
});

describe('parsing flags', () => {
  it('reads --yes and -y', () => {
    expect(parseCliArgs(['--yes']).useDefaults).toBe(true);
    expect(parseCliArgs(['-y']).useDefaults).toBe(true);
    expect(parseCliArgs([]).useDefaults).toBe(false);
  });

  it('reads --help and -h', () => {
    expect(parseCliArgs(['--help']).showHelp).toBe(true);
    expect(parseCliArgs(['-h']).showHelp).toBe(true);
  });

  it('reads a choice answer', () => {
    expect(parseCliArgs(['--packageManager=yarn']).answers).toStrictEqual({ packageManager: 'yarn' });
  });

  it('reads a free-text answer', () => {
    expect(parseCliArgs(['--pluginName=My Plugin']).answers).toStrictEqual({ pluginName: 'My Plugin' });
  });

  // A funding URL can carry a query string, so the split is on the FIRST `=` only.
  it('keeps a value containing =', () => {
    const { answers } = parseCliArgs(['--fundingUrl=https://example.com/pay?a=1&b=2']);
    expect(answers.fundingUrl).toBe('https://example.com/pay?a=1&b=2');
  });

  it('accepts an empty value for a presence branch', () => {
    expect(parseCliArgs(['--fundingUrl=']).answers).toStrictEqual({ fundingUrl: '' });
  });

  it('refuses an unknown answer, naming the ones it takes', () => {
    expect(() => parseCliArgs(['--nonsense=1'])).toThrow(/Unknown answer "nonsense"/);
    expect(() => parseCliArgs(['--nonsense=1'])).toThrow(/packageManager/);
  });

  it('refuses a value outside a closed set, listing that set', () => {
    expect(() => parseCliArgs(['--bundler=grunt'])).toThrow(/"grunt" is not an answer to bundler/);
    expect(() => parseCliArgs(['--bundler=grunt'])).toThrow(/esbuild, parcel, rollup, vite, webpack/);
  });

  it('refuses a computed key rather than dropping it', () => {
    expect(() => parseCliArgs(['--currentYear=2026'])).toThrow(/computed by the generator/);
    expect(() => parseCliArgs(['--pluginShortName=X'])).toThrow(/computed by the generator/);
  });

  it('refuses an argument that is not --<answer>=<value>', () => {
    expect(() => parseCliArgs(['bundler=esbuild'])).toThrow(/Expected --<answer>=<value>/);
    expect(() => parseCliArgs(['--bundler'])).toThrow(/Expected --<answer>=<value>/);
  });

  // These ran only inside the clack prompt, so an answer arriving any other way was unchecked.
  it('applies the free-text validators the prompts use', () => {
    expect(() => parseCliArgs(['--pluginId=obsidian-thing'])).toThrow(/not start with "obsidian-"/);
    expect(() => parseCliArgs(['--pluginId=My_Plugin'])).toThrow(/lowercase English letters/);
    expect(() => parseCliArgs(['--pluginDescription=No trailing dot'])).toThrow(/end with a dot/);
    expect(() => parseCliArgs(['--authorName='])).toThrow(/Should not be empty/);
  });
});

describe('the demo pin', () => {
  // T735-P42: demo emits a project that cannot build when a second JSX runtime is forced in beside
  // React, and was closed on the grounds that the combination is unreachable from every CLI path.
  it('refuses preset=demo alongside an answer demo discards', () => {
    expect(() => parseCliArgs(['--preset=demo', '--uiFramework=solid'])).toThrow(/preset=demo pins uiFramework/);
    expect(() => parseCliArgs(['--preset=demo', '--bundler=rollup'])).toThrow(/preset=demo pins bundler/);
  });

  it('allows the same answers under another preset', () => {
    expect(() => parseCliArgs(['--preset=enhanced', '--uiFramework=solid'])).not.toThrow();
  });

  it('allows demo alongside an answer it honours', () => {
    expect(() => parseCliArgs(['--preset=demo', '--linter=biome'])).not.toThrow();
  });
});

describe('the answers file', () => {
  it('reads a bare answers object', () => {
    const path = writeAnswersFile('bare.json', { linter: 'biome', packageManager: 'pnpm' });
    expect(parseCliArgs([`--answersFile=${path}`]).answers).toStrictEqual({ linter: 'biome', packageManager: 'pnpm' });
  });

  // So the file can be pointed straight at an existing project to scaffold another one like it.
  it('reads a whole .create-obsidian-plugin.json, ignoring the computed keys it records', () => {
    const path = writeAnswersFile('config.json', {
      answers: { currentYear: SAVED_CURRENT_YEAR, packageManager: 'bun', pluginShortName: 'Thing' },
      fileHashes: { 'README.md': 'abc' },
      generatorVersion: '1.2.3'
    });
    expect(parseCliArgs([`--answersFile=${path}`]).answers).toStrictEqual({ packageManager: 'bun' });
  });

  it('validates its values exactly as a flag would', () => {
    const path = writeAnswersFile('bad-value.json', { bundler: 'grunt' });
    expect(() => parseCliArgs([`--answersFile=${path}`])).toThrow(/"grunt" is not an answer to bundler/);
  });

  it('refuses an unknown key', () => {
    const path = writeAnswersFile('bad-key.json', { nonsense: 'x' });
    expect(() => parseCliArgs([`--answersFile=${path}`])).toThrow(/Unknown answer "nonsense"/);
  });

  it('refuses a non-string value', () => {
    const path = writeAnswersFile('bad-type.json', { linter: NOT_A_STRING });
    expect(() => parseCliArgs([`--answersFile=${path}`])).toThrow(/should be a string, got number/);
  });

  it('refuses a missing file, malformed JSON, and a non-object', () => {
    expect(() => parseCliArgs([`--answersFile=${join(tempDir, 'nope.json')}`])).toThrow(/not found/);
    expect(() => parseCliArgs([`--answersFile=${writeAnswersFile('broken.json', '{oops')}`])).toThrow(/not valid JSON/);
    expect(() => parseCliArgs([`--answersFile=${writeAnswersFile('array.json', NOT_AN_OBJECT)}`])).toThrow(/should contain a JSON object/);
  });

  it('lets an individual flag override the file', () => {
    const path = writeAnswersFile('override.json', { linter: 'biome', packageManager: 'pnpm' });
    const { answers } = parseCliArgs([`--answersFile=${path}`, '--packageManager=yarn']);
    expect(answers).toStrictEqual({ linter: 'biome', packageManager: 'yarn' });
  });
});
