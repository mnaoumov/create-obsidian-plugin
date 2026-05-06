import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { None } from './none.ts';
import { ObsidianTest } from './obsidian-test.ts';
import { WdioObsidian } from './wdio-obsidian.ts';

export const E2E_TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new None(), new ObsidianTest(), new WdioObsidian()];

export async function promptE2eTestRunner(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'E2E testing', options: E2E_TEST_RUNNER_OPTIONS, savedValue });
}
