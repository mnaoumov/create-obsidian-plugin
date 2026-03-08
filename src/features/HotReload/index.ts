import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { HotReloadPlugin } from './HotReloadPlugin.ts';
import { None } from './None.ts';

export const HOT_RELOAD_OPTIONS: readonly FeatureOption[] = [new HotReloadPlugin(), new None()];

export async function promptHotReload(defaultValue?: string): Promise<string> {
  return promptFeature(HOT_RELOAD_OPTIONS, 'Hot reload', defaultValue);
}
