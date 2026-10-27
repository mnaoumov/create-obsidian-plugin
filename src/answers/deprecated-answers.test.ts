import { log } from '@clack/prompts';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { resolveDeprecatedAnswer } from './deprecated-answers.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveDeprecatedAnswer', () => {
  it('maps preset "enhanced" to "all-in-one" and warns once, naming where it was read', () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    expect(resolveDeprecatedAnswer('preset', 'enhanced', '--preset')).toBe('all-in-one');
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('--preset');
  });

  it('passes a current value through without a warning', () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    expect(resolveDeprecatedAnswer('preset', 'all-in-one', '--preset')).toBe('all-in-one');
    expect(resolveDeprecatedAnswer('linter', 'enhanced', '--linter')).toBe('enhanced');
    expect(warn).not.toHaveBeenCalled();
  });
});
