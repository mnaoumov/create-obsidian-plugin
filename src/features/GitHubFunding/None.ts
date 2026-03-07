import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No funding configuration', promptLabel: 'None', settingValue: 'none' });
  }
}
