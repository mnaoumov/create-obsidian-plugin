import { select } from '@clack/prompts';

import type { FeatureOption } from '../../FeatureOption.ts';

import { assertNotCancelled } from '../../clack-utils.ts';
import { Dprint } from './Dprint.ts';
import { None } from './None.ts';
import { Prettier } from './Prettier.ts';

export const FORMATTER_OPTIONS: readonly FeatureOption[] = [new Prettier(), new Dprint(), new None()];

export async function promptFormatter(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'prettier',
    message: 'Formatter',
    options: FORMATTER_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  assertNotCancelled(result);
  return result;
}
