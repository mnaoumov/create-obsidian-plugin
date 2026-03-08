import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Cspell } from './Cspell.ts';
import { None } from './None.ts';

export const SPELL_CHECKER_OPTIONS: readonly FeatureOption[] = [new None(), new Cspell()];

export async function promptSpellChecker(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Cspell(), message: 'Spell checker', options: SPELL_CHECKER_OPTIONS, savedValue });
}
