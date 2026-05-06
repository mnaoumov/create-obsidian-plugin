import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Lit } from './lit.ts';
import { None } from './none.ts';
import { Preact } from './preact.ts';
import { React } from './react.ts';
import { Solid } from './solid.ts';
import { Svelte } from './svelte.ts';
import { Vue } from './vue.ts';

export const UI_FRAMEWORK_OPTIONS: readonly FeatureOption[] = [new None(), new Lit(), new Preact(), new React(), new Solid(), new Svelte(), new Vue()];

export async function promptUiFramework(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'UI framework', options: UI_FRAMEWORK_OPTIONS, savedValue });
}
