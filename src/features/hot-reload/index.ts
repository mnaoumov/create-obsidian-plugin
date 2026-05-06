import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { HotReloadPlugin } from './hot-reload-plugin.ts';
import { None } from './none.ts';
import { ObsidianCli } from './obsidian-cli.ts';

export const HOT_RELOAD_OPTIONS: readonly FeatureOption[] = [new None(), new HotReloadPlugin(), new ObsidianCli()];

export async function promptHotReload(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new ObsidianCli(), message: 'Hot reload', options: HOT_RELOAD_OPTIONS, savedValue });
}
