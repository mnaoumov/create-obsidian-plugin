import { FeatureOption } from '../../feature-option.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No funding configuration', promptLabel: '(none)', settingValue: 'none' });
  }
}
