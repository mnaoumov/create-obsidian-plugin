import { FeatureOption } from '../../FeatureOption.ts';

export class Official extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Stable, documented API only', promptLabel: 'Official API', settingValue: 'official' });
  }
}
