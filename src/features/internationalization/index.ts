import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { I18next } from './i18next.ts';
import { None } from './none.ts';
import { TypesafeI18n } from './typesafe-i18n.ts';

export const INTERNATIONALIZATION_OPTIONS: readonly FeatureOption[] = [new None(), new I18next(), new TypesafeI18n()];

export async function promptInternationalization(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'Internationalization', options: INTERNATIONALIZATION_OPTIONS, savedValue });
}
