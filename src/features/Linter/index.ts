import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Biome } from './Biome.ts';
import { Eslint } from './Eslint.ts';
import { None } from './None.ts';

export const LINTER_OPTIONS: readonly FeatureOption[] = [new Eslint(), new Biome(), new None()];

export async function promptLinter(defaultValue?: string): Promise<string> {
  return promptFeature(LINTER_OPTIONS, 'Linter', defaultValue);
}
