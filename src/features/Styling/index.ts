import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Css } from './Css.ts';
import { CssModules } from './CssModules.ts';
import { None } from './None.ts';
import { PostCss } from './PostCss.ts';
import { Scss } from './Scss.ts';
import { Tailwind } from './Tailwind.ts';

export const STYLING_OPTIONS: readonly FeatureOption[] = [new None(), new Css(), new CssModules(), new PostCss(), new Scss(), new Tailwind()];

export async function promptStyling(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Scss(), message: 'Styling', options: STYLING_OPTIONS, savedValue });
}
