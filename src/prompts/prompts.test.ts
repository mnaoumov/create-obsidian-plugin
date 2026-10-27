import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { Answers } from '../answers/answers.ts';

import {
  getDefaultAnswers,
  promptAnswers
} from './prompts.ts';

interface SeededPromptOptions {
  defaultValue?: string;
  initialValue?: string;
  message: string;
  options?: SelectOption[];
}

interface SelectOption {
  hint?: string;
  label: string;
  value: string;
}

const PLUGIN_ID_MESSAGE = 'Plugin id (lowercase, hyphens allowed)';
const TOOLING_MESSAGE = 'Tooling';

// The project-details questions alone are more than this, so a run asking fewer has skipped them.
const MIN_QUESTIONS_ASKED_AGAIN = 5;

const askedMessages: string[] = [];
let toolingAnswer: string | undefined;
let toolingOptions: SelectOption[] | undefined;

vi.mock('@clack/prompts', () => ({
  cancel: vi.fn(),
  log: { info: vi.fn() }
}));

// Each prompt accepts what it was seeded with, as pressing Enter does, except a `Tooling` answer a test sets.
vi.mock('./clack-select.ts', () => ({
  select: vi.fn((opts: SeededPromptOptions) => {
    askedMessages.push(opts.message);
    if (opts.message === TOOLING_MESSAGE) {
      toolingOptions = opts.options;
      return Promise.resolve(toolingAnswer ?? opts.initialValue ?? '');
    }
    return Promise.resolve(opts.initialValue ?? '');
  })
}));

vi.mock('./clack-text.ts', () => ({
  text: vi.fn((opts: SeededPromptOptions) => {
    askedMessages.push(opts.message);
    return Promise.resolve(opts.defaultValue ?? '');
  })
}));

describe('promptAnswers', () => {
  beforeEach(() => {
    askedMessages.length = 0;
    toolingAnswer = undefined;
    toolingOptions = undefined;
  });

  it('asks again from the saved answers when none of them was supplied on this run', async () => {
    const saved: Answers = {
      ...getDefaultAnswers({ pluginId: 'saved-helper' }),
      fundingPlatform: 'none',
      linter: 'biome',
      preset: 'standalone'
    };

    const answers = await promptAnswers(saved, {});

    expect(askedMessages).toContain(PLUGIN_ID_MESSAGE);
    expect(askedMessages.length).toBeGreaterThan(MIN_QUESTIONS_ASKED_AGAIN);
    expect(answers.pluginId).toBe('saved-helper');
    expect(answers.preset).toBe('standalone');
    expect(answers.linter).toBe(saved.linter);
  });

  it('still skips a question a flag answered', async () => {
    const saved = getDefaultAnswers({ pluginId: 'saved-helper' });

    const answers = await promptAnswers({ ...saved, pluginId: 'flag-helper' }, { pluginId: 'flag-helper' });

    expect(askedMessages).not.toContain(PLUGIN_ID_MESSAGE);
    expect(askedMessages.length).toBeGreaterThan(MIN_QUESTIONS_ASKED_AGAIN);
    expect(answers.pluginId).toBe('flag-helper');
  });

  it('treats the defaults as supplied when no separate set is given', async () => {
    const answers = await promptAnswers(getDefaultAnswers({ pluginId: 'saved-helper' }));

    // `Tooling` has no saved answer, so it is the one question a full set leaves.
    expect(askedMessages).toEqual(['Tooling']);
    expect(answers.pluginId).toBe('saved-helper');
  });

  describe('the Tooling question on an update', () => {
    const saved: Answers = {
      ...getDefaultAnswers({ pluginId: 'saved-helper' }),
      linter: 'biome',
      packageManager: 'pnpm'
    };

    it('offers to keep the saved tooling first, naming what differs from the recommended set', async () => {
      const answers = await promptAnswers(saved, {});

      const options = getToolingOptions();
      const [keep, , recommended] = options;
      expect(options.map((option) => option.label)).toEqual(['Keep current tooling', 'Customize', 'Use recommended defaults']);
      expect(keep?.hint).toBe('Linter: Biome, Package manager: pnpm');
      expect(recommended?.hint).toBe('Linter: Biome -> ESLint, Package manager: pnpm -> npm');
      expect(answers.linter).toBe('biome');
      expect(answers.packageManager).toBe('pnpm');
    });

    it('applies the recommended tooling when that is the answer', async () => {
      toolingAnswer = 'defaults';

      const answers = await promptAnswers(saved, {});

      expect(answers.linter).toBe('eslint');
      expect(answers.packageManager).toBe('npm');
    });

    it('keeps a flag over the recommended tooling, and leaves it out of the hint', async () => {
      toolingAnswer = 'defaults';

      const answers = await promptAnswers({ ...saved, linter: 'none' }, { linter: 'none' });

      const [, , recommended] = getToolingOptions();
      expect(recommended?.hint).toBe('Package manager: pnpm -> npm');
      expect(answers.linter).toBe('none');
      expect(answers.packageManager).toBe('npm');
    });

    it('offers only the two options when the saved tooling is the recommended set', async () => {
      await promptAnswers(getDefaultAnswers({ pluginId: 'saved-helper' }), {});

      expect(getToolingOptions().map((option) => option.label)).toEqual(['Customize', 'Use recommended defaults']);
    });

    it('counts the differences it does not name', async () => {
      await promptAnswers({ ...saved, formatter: 'prettier', styling: 'css' }, {});

      expect(getToolingOptions()[0]?.hint).toBe('Linter: Biome, Formatter: Prettier, Styling: CSS, and 1 more');
    });
  });
});

function getToolingOptions(): SelectOption[] {
  const options = toolingOptions;
  if (!options) {
    throw new Error('The Tooling question was not asked.');
  }
  return options;
}
