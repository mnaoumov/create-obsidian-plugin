import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Official } from './Official.ts';
import { WithUnofficial } from './WithUnofficial.ts';

export const API_SUBSET_OPTIONS: readonly FeatureOption[] = [new Official(), new WithUnofficial()];

export async function promptApiSubset(defaultValue?: string): Promise<string> {
  return promptFeature(API_SUBSET_OPTIONS, 'Obsidian API subset', defaultValue);
}
