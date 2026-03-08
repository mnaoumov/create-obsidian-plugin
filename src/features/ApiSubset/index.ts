import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Official } from './Official.ts';
import { WithUnofficial } from './WithUnofficial.ts';

export const API_SUBSET_OPTIONS: readonly FeatureOption[] = [new Official(), new WithUnofficial()];

export async function promptApiSubset(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Official(), message: 'Obsidian API subset', options: API_SUBSET_OPTIONS, savedValue });
}
