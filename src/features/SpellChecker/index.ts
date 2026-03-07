import { select } from '@clack/prompts';

import type { FeatureOption } from '../../FeatureOption.ts';

import { assertNotCancelled } from '../../clack-utils.ts';
import { Cspell } from './Cspell.ts';
import { None } from './None.ts';

export const SPELL_CHECKER_OPTIONS: readonly FeatureOption[] = [new Cspell(), new None()];

export async function promptSpellChecker(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'cspell',
    message: 'Spell checker',
    options: SPELL_CHECKER_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  assertNotCancelled(result);
  return result;
}
