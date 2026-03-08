import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Biome } from './Biome.ts';
import { Eslint } from './Eslint.ts';
import { None } from './None.ts';

export const LINTER_OPTIONS: readonly FeatureOption[] = [new None(), new Biome(), new Eslint()];

export async function promptLinter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Eslint(), message: 'Linter', options: LINTER_OPTIONS, savedValue });
}
