import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { HotReloadPlugin } from './HotReloadPlugin.ts';
import { None } from './None.ts';
import { ObsidianCli } from './ObsidianCli.ts';

export const HOT_RELOAD_OPTIONS: readonly FeatureOption[] = [new None(), new ObsidianCli(), new HotReloadPlugin()];

export async function promptHotReload(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new ObsidianCli(), message: 'Hot reload', options: HOT_RELOAD_OPTIONS, savedValue });
}
