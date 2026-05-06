import { FeatureOption } from '../../feature-option.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No GitHub Actions workflows', promptLabel: '(none)', settingValue: 'none' });
  }
}
