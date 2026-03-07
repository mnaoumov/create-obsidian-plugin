import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { None } from './None.ts';
import { Wasm } from './Wasm.ts';

export const WASM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new None(), new Wasm()];

export async function promptWasmSupport(defaultValue?: string): Promise<string> {
  return promptFeature(WASM_SUPPORT_OPTIONS, 'WebAssembly support', defaultValue);
}
