import { select } from '@clack/prompts';

import type { FeatureOption } from '../../FeatureOption.ts';

import { assertNotCancelled } from '../../clack-utils.ts';
import { Eslint } from './Eslint.ts';
import { None } from './None.ts';

export const LINTER_OPTIONS: readonly FeatureOption[] = [new Eslint(), new None()];

export async function promptLinter(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'eslint',
    message: 'Linter',
    options: LINTER_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  assertNotCancelled(result);
  return result;
}
