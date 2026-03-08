import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No hot reload support', promptLabel: 'None', settingValue: 'none' });
  }
}
