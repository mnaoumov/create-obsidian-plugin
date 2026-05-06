import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Biome } from './biome.ts';
import { Eslint } from './eslint.ts';
import { None } from './none.ts';

export const LINTER_OPTIONS: readonly FeatureOption[] = [new None(), new Biome(), new Eslint()];

export async function promptLinter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Eslint(), message: 'Linter', options: LINTER_OPTIONS, savedValue });
}
