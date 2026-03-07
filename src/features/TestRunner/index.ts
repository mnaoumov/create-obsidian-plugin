import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Jest } from './Jest.ts';
import { None } from './None.ts';
import { Vitest } from './Vitest.ts';

export const TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new Vitest(), new Jest(), new None()];

export async function promptTestRunner(defaultValue?: string): Promise<string> {
  return promptFeature(TEST_RUNNER_OPTIONS, 'Unit testing', defaultValue);
}
