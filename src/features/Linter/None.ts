import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No linting', promptLabel: 'None', settingValue: 'none' });
  }
}
