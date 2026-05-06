import { FeatureOption } from '../../feature-option.ts';

export class Yarn extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Classic alternative with workspaces', promptLabel: 'Yarn', settingValue: 'yarn' });
  }
}
