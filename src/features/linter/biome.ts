import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Biome extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast linter and formatter', promptLabel: 'Biome', settingValue: 'biome' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@biomejs/biome')
      .addScript('lint')
      .addScript('lint:fix')
      .addFiles([
        'biome.json',
        'scripts/lint.ts',
        'scripts/lint-fix.ts'
      ]);
  }
}
