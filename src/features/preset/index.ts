import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { AllInOne } from './all-in-one.ts';
import { Demo } from './demo.ts';
import { Standalone } from './standalone.ts';

export const PRESET_OPTIONS: readonly FeatureOption[] = [new AllInOne(), new Demo(), new Standalone()];

export async function promptPreset(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new AllInOne(), message: 'Choose a preset', options: PRESET_OPTIONS, savedValue });
}
