import { FeatureOption } from '../../FeatureContribution.ts';

export class Official extends FeatureOption {
  constructor() {
    super({ settingValue: 'official', promptLabel: 'Official API', promptHint: 'Stable, documented API only' });
  }
}
