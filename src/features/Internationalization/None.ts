import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No internationalization', promptLabel: '(none)', settingValue: 'none' });
  }
}
