import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Cspell } from './Cspell.ts';
import { None } from './None.ts';

export const SPELL_CHECKER_OPTIONS: readonly FeatureOption[] = [new None(), new Cspell()];

export async function promptSpellChecker(defaultValue?: string): Promise<string> {
  return promptFeature(SPELL_CHECKER_OPTIONS, 'Spell checker', defaultValue ?? 'cspell');
}
