import { FeatureOption } from '../../feature-option.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No E2E testing', promptLabel: '(none)', settingValue: 'none' });
  }
}
