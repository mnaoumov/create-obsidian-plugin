import { FeatureOption } from '../../FeatureContribution.ts';

export class None extends FeatureOption {
  constructor() {
    super({ settingValue: 'none', promptLabel: 'None', promptHint: 'No unit testing' });
  }
}
