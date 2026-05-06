import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Demo } from './demo.ts';
import { Enhanced } from './enhanced.ts';
import { Standalone } from './standalone.ts';

export const PRESET_OPTIONS: readonly FeatureOption[] = [new Demo(), new Enhanced(), new Standalone()];

export async function promptPreset(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Enhanced(), message: 'Choose a preset', options: PRESET_OPTIONS, savedValue });
}
