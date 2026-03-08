import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { None } from './None.ts';
import { ObsidianTest } from './ObsidianTest.ts';
import { WdioObsidian } from './WdioObsidian.ts';

export const E2E_TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new None(), new ObsidianTest(), new WdioObsidian()];

export async function promptE2eTestRunner(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'E2E testing', options: E2E_TEST_RUNNER_OPTIONS, savedValue });
}
