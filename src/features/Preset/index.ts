import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Demo } from './Demo.ts';
import { Enhanced } from './Enhanced.ts';
import { Standalone } from './Standalone.ts';

export const PRESET_OPTIONS: readonly FeatureOption[] = [new Enhanced(), new Standalone(), new Demo()];

export async function promptPreset(defaultValue?: string): Promise<string> {
  return promptFeature(PRESET_OPTIONS, 'Choose a preset', defaultValue);
}
