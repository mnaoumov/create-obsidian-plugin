import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Lit } from './Lit.ts';
import { None } from './None.ts';
import { Preact } from './Preact.ts';
import { React } from './React.ts';
import { Solid } from './Solid.ts';
import { Svelte } from './Svelte.ts';
import { Vue } from './Vue.ts';

export const UI_FRAMEWORK_OPTIONS: readonly FeatureOption[] = [new Lit(), new None(), new Preact(), new React(), new Solid(), new Svelte(), new Vue()];

export async function promptUiFramework(defaultValue?: string): Promise<string> {
  return promptFeature(UI_FRAMEWORK_OPTIONS, 'UI framework', defaultValue);
}
