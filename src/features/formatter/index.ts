import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Biome } from './biome.ts';
import { Dprint } from './dprint.ts';
import { None } from './none.ts';
import { Prettier } from './prettier.ts';

export const FORMATTER_OPTIONS: readonly FeatureOption[] = [new None(), new Biome(), new Dprint(), new Prettier()];

export async function promptFormatter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Dprint(), message: 'Formatter', options: FORMATTER_OPTIONS, savedValue });
}
