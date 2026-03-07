import { select } from '@clack/prompts';

import type { FeatureOption } from '../../FeatureOption.ts';

import { assertNotCancelled } from '../../clack-utils.ts';
import { None } from './None.ts';
import { React } from './React.ts';
import { Svelte } from './Svelte.ts';
import { Vue } from './Vue.ts';

export const FRAMEWORK_OPTIONS: readonly FeatureOption[] = [new None(), new React(), new Svelte(), new Vue()];

export async function promptFramework(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'none',
    message: 'UI framework',
    options: FRAMEWORK_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  assertNotCancelled(result);
  return result;
}
