import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No E2E testing', promptLabel: 'None', settingValue: 'none' });
  }
}
