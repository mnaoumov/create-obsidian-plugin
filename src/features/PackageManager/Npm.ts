import { FeatureOption } from '../../FeatureOption.ts';

export class Npm extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Default, comes with Node.js', promptLabel: 'npm', settingValue: 'npm' });
  }
}
