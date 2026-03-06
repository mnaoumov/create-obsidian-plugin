import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { Jest } from './Jest.ts';
import { None } from './None.ts';
import { Vitest } from './Vitest.ts';

export const TEST_RUNNER_OPTIONS: readonly FeatureOption[] = [new Vitest(), new Jest(), new None()];

export async function promptTestRunner(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'vitest',
    message: 'Unit testing',
    options: TEST_RUNNER_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
