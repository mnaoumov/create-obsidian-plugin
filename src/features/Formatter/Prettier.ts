import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Prettier extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Opinionated, widely adopted', promptLabel: 'Prettier', settingValue: 'prettier' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('prettier')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        'scripts/format.ts',
        'scripts/format-check.ts'
      ]);
  }
}
