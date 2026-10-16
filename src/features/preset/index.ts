import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { AllInOne } from './all-in-one.ts';
import { Demo } from './demo.ts';
import { OfficialSample } from './official-sample.ts';
import { Standalone } from './standalone.ts';

/** The template presets: the ones `buildTemplate` composes and the verification tiers sweep. */
export const PRESET_OPTIONS: readonly FeatureOption[] = [new AllInOne(), new Demo(), new Standalone()];

/** Every preset the prompt offers: the template presets, then the official sample, which copies upstream instead. */
export const PRESET_PROMPT_OPTIONS: readonly FeatureOption[] = [...PRESET_OPTIONS, new OfficialSample()];

export async function promptPreset(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new AllInOne(), message: 'Choose a preset', options: PRESET_PROMPT_OPTIONS, savedValue });
}
