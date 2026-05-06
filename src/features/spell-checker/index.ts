import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Cspell } from './cspell.ts';
import { None } from './none.ts';

export const SPELL_CHECKER_OPTIONS: readonly FeatureOption[] = [new None(), new Cspell()];

export async function promptSpellChecker(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Cspell(), message: 'Spell checker', options: SPELL_CHECKER_OPTIONS, savedValue });
}
