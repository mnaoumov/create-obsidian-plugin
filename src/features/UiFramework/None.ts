import { FeatureOption } from '../../FeatureOption.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Plain TypeScript, no UI framework', promptLabel: '(none)', settingValue: 'none' });
  }
}
