import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No unit testing', promptLabel: 'None', settingValue: 'none' });
  }
}
