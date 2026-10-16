import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { Answers } from './answers.ts';

import {
  getDefaultAnswers,
  promptAnswers
} from './prompts.ts';

interface SeededPromptOptions {
  defaultValue?: string;
  initialValue?: string;
  message: string;
}

const PLUGIN_ID_MESSAGE = 'Plugin id (lowercase, hyphens allowed)';

// The project-details questions alone are more than this, so a run asking fewer has skipped them.
const MIN_QUESTIONS_ASKED_AGAIN = 5;

const askedMessages: string[] = [];

vi.mock('@clack/prompts', () => ({
  cancel: vi.fn(),
  log: { info: vi.fn() }
}));

// Each prompt accepts what it was seeded with, as pressing Enter does.
vi.mock('./clack-select.ts', () => ({
  select: vi.fn((opts: SeededPromptOptions) => {
    askedMessages.push(opts.message);
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
});
