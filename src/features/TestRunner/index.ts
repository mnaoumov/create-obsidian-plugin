import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Jest } from './Jest.ts';
import { None } from './None.ts';
import { Vitest } from './Vitest.ts';

export const TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new None(), new Jest(), new Vitest()];

export async function promptTestRunner(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Vitest(), message: 'Unit testing', options: TEST_RUNNER_OPTIONS, savedValue });
}
