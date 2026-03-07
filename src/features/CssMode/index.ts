import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Css } from './Css.ts';
import { None } from './None.ts';
import { Scss } from './Scss.ts';

export const CSS_MODE_OPTIONS: readonly FeatureOption[] = [new None(), new Css(), new Scss()];

export async function promptCssMode(defaultValue?: string): Promise<string> {
  return promptFeature(CSS_MODE_OPTIONS, 'CSS', defaultValue);
}
