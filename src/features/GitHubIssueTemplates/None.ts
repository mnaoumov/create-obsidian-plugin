import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No issue templates', promptLabel: 'None', settingValue: 'none' });
  }
}
