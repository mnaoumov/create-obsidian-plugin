import { FeatureOption } from '../../feature-option.ts';

export class DesktopOnly extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Plugin works only on desktop', promptLabel: 'Desktop only', settingValue: 'desktop-only' });
  }
}
