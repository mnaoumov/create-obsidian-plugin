import { FeatureOption } from '../../FeatureOption.ts';

export class Yarn extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Classic alternative with workspaces', promptLabel: 'Yarn', settingValue: 'yarn' });
  }
}
