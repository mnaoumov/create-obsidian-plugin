import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { None } from './None.ts';
import { React } from './React.ts';
import { Svelte } from './Svelte.ts';
import { Vue } from './Vue.ts';

export const FRAMEWORK_OPTIONS: readonly FeatureOption[] = [new None(), new React(), new Svelte(), new Vue()];

export async function promptFramework(defaultValue?: string): Promise<string> {
  return promptFeature(FRAMEWORK_OPTIONS, 'UI framework', defaultValue);
}
