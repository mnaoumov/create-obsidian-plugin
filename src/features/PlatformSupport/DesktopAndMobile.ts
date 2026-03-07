import { FeatureOption } from '../../FeatureOption.ts';

export class DesktopAndMobile extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Plugin works on desktop and mobile', promptLabel: 'Desktop and mobile', settingValue: 'desktop-and-mobile' });
  }
}
