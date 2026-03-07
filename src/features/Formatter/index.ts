import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Dprint } from './Dprint.ts';
import { None } from './None.ts';
import { Prettier } from './Prettier.ts';

export const FORMATTER_OPTIONS: readonly FeatureOption[] = [new Prettier(), new Dprint(), new None()];

export async function promptFormatter(defaultValue?: string): Promise<string> {
  return promptFeature(FORMATTER_OPTIONS, 'Formatter', defaultValue);
}
