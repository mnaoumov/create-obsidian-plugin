import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { None } from './None.ts';
import { Wasm } from './Wasm.ts';

export const WASM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new None(), new Wasm()];

export async function promptWasmSupport(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'WebAssembly support', options: WASM_SUPPORT_OPTIONS, savedValue });
}
