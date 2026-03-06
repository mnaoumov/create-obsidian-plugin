import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { None } from './None.ts';
import { Wasm } from './Wasm.ts';

export const WASM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new None(), new Wasm()];

export async function promptWasmSupport(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'none',
    message: 'WebAssembly support',
    options: WASM_SUPPORT_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
