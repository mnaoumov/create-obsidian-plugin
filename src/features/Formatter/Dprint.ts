import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Dprint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast, pluggable, written in Rust', promptLabel: 'dprint', settingValue: 'dprint' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('dprint')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        'dprint.json',
        'scripts/format.ts',
        'scripts/format-check.ts'
      ]);
  }
}
