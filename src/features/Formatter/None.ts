import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No formatting', promptLabel: '(none)', settingValue: 'none' });
  }
}
