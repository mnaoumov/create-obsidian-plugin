import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No custom styles', promptLabel: 'None', settingValue: 'none' });
  }
}
