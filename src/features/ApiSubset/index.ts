import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { Official } from './Official.ts';
import { WithUnofficial } from './WithUnofficial.ts';

export const API_SUBSET_OPTIONS: readonly FeatureOption[] = [new Official(), new WithUnofficial()];

export async function promptApiSubset(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'official',
    message: 'Obsidian API subset',
    options: API_SUBSET_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
