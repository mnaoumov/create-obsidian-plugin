import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { Demo } from './Demo.ts';
import { Enhanced } from './Enhanced.ts';
import { Standalone } from './Standalone.ts';

export const PRESET_OPTIONS: readonly FeatureOption[] = [new Enhanced(), new Standalone(), new Demo()];

export async function promptPreset(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'enhanced',
    message: 'Choose a preset',
    options: PRESET_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
