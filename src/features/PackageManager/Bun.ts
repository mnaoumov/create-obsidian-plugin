import { FeatureOption } from '../../FeatureOption.ts';

export class Bun extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast all-in-one JavaScript toolkit', promptLabel: 'Bun', settingValue: 'bun' });
  }
}
