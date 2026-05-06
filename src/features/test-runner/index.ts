import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Jest } from './jest.ts';
import { None } from './none.ts';
import { Vitest } from './vitest.ts';

export const TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new None(), new Jest(), new Vitest()];

export async function promptTestRunner(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Vitest(), message: 'Unit testing', options: TEST_RUNNER_OPTIONS, savedValue });
}
