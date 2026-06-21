import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { CssModules } from './css-modules.ts';
import { Css } from './css.ts';
import { None } from './none.ts';
import { PostCss } from './post-css.ts';
import { Scss } from './scss.ts';
import { Tailwind } from './tailwind.ts';

export const STYLING_OPTIONS: readonly FeatureOption[] = [new None(), new Css(), new CssModules(), new PostCss(), new Scss(), new Tailwind()];

export async function promptStyling(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Scss(), message: 'Styling', options: STYLING_OPTIONS, savedValue });
}
