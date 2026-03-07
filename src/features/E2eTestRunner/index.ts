import { select } from '@clack/prompts';

import type { FeatureOption } from '../../FeatureOption.ts';

import { assertNotCancelled } from '../../clack-utils.ts';
import { None } from './None.ts';
import { ObsidianTest } from './ObsidianTest.ts';
import { Playwright } from './Playwright.ts';
import { WdioObsidian } from './WdioObsidian.ts';

export const E2E_TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new None(), new ObsidianTest(), new WdioObsidian(), new Playwright()];

export async function promptE2eTestRunner(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'none',
    message: 'E2E testing',
    options: E2E_TEST_RUNNER_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  assertNotCancelled(result);
  return result;
}
