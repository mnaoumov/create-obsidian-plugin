import { FeatureOption } from '../../FeatureOption.ts';

export class HotReloadPlugin extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Creates .hotreload marker for pjeby/hot-reload', promptLabel: 'Hot Reload Plugin', settingValue: 'hot-reload-plugin' });
  }
}
