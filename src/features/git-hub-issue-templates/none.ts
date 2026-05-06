import { FeatureOption } from '../../feature-option.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No issue templates', promptLabel: '(none)', settingValue: 'none' });
  }
}
