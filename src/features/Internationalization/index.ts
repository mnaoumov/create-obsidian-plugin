import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { I18next } from './I18next.ts';
import { None } from './None.ts';
import { TypesafeI18n } from './TypesafeI18n.ts';

export const INTERNATIONALIZATION_OPTIONS: readonly FeatureOption[] = [new None(), new I18next(), new TypesafeI18n()];

export async function promptInternationalization(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'Internationalization', options: INTERNATIONALIZATION_OPTIONS, savedValue });
}
