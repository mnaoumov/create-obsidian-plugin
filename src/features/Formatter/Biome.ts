import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Biome extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast formatter (pairs with Biome linter)', promptLabel: 'Biome', settingValue: 'biome' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@biomejs/biome')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        'biome.json',
        'scripts/format.ts',
        'scripts/format-check.ts'
      ]);
  }
}
