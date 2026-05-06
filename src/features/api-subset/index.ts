import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Official } from './official.ts';
import { WithUnofficial } from './with-unofficial.ts';

export const API_SUBSET_OPTIONS: readonly FeatureOption[] = [new Official(), new WithUnofficial()];

export async function promptApiSubset(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Official(), message: 'Obsidian API subset', options: API_SUBSET_OPTIONS, savedValue });
}
