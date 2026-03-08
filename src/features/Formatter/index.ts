import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Biome } from './Biome.ts';
import { Dprint } from './Dprint.ts';
import { None } from './None.ts';
import { Prettier } from './Prettier.ts';

export const FORMATTER_OPTIONS: readonly FeatureOption[] = [new None(), new Biome(), new Dprint(), new Prettier()];

export async function promptFormatter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Dprint(), message: 'Formatter', options: FORMATTER_OPTIONS, savedValue });
}
