import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class CiAndRelease extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CI + automated release on tag push', promptLabel: 'CI + Release', settingValue: 'ci-and-release' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles([
      '.github/workflows/ci.yml',
      '.github/workflows/release.yml'
    ]);
  }
}
