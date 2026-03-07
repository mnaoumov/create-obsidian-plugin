import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { None } from './None.ts';
import { ObsidianTest } from './ObsidianTest.ts';
import { WdioObsidian } from './WdioObsidian.ts';

export const E2E_TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new None(), new ObsidianTest(), new WdioObsidian()];

export async function promptE2eTestRunner(defaultValue?: string): Promise<string> {
  return promptFeature(E2E_TEST_RUNNER_OPTIONS, 'E2E testing', defaultValue);
}
