import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { Esbuild } from './Esbuild.ts';
import { Rollup } from './Rollup.ts';
import { Vite } from './Vite.ts';

export const BUILD_SYSTEM_OPTIONS: readonly FeatureOption[] = [new Esbuild(), new Rollup(), new Vite()];

export async function promptBuildSystem(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'esbuild',
    message: 'Build system',
    options: BUILD_SYSTEM_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
