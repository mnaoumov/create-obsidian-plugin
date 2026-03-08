import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Css } from './Css.ts';
import { None } from './None.ts';
import { Scss } from './Scss.ts';

export const STYLING_OPTIONS: readonly FeatureOption[] = [new None(), new Css(), new Scss()];

export async function promptStyling(defaultValue?: string): Promise<string> {
  return promptFeature(STYLING_OPTIONS, 'Styling', defaultValue);
}
