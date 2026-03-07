import { FeatureOption } from '../../FeatureOption.ts';

export class Pnpm extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast, efficient disk space', promptLabel: 'pnpm', settingValue: 'pnpm' });
  }
}
