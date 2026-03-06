import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { Css } from './Css.ts';
import { None } from './None.ts';
import { Scss } from './Scss.ts';

export const CSS_MODE_OPTIONS: readonly FeatureOption[] = [new None(), new Css(), new Scss()];

export async function promptCssMode(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'none',
    message: 'CSS',
    options: CSS_MODE_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
