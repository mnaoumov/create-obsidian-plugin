import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Dprint extends FeatureOption {
  constructor() {
    super({ settingValue: 'dprint', promptLabel: 'dprint', promptHint: 'Fast, pluggable, written in Rust' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('dprint')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        'scripts/format.ts',
        'scripts/format-check.ts',
      ]);
  }
}
