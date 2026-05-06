import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { None } from './none.ts';
import { Wasm } from './wasm.ts';

export const WASM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new None(), new Wasm()];

export async function promptWasmSupport(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'WebAssembly support', options: WASM_SUPPORT_OPTIONS, savedValue });
}
