import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Prettier extends FeatureOption {
  constructor() {
    super({ settingValue: 'prettier', promptLabel: 'Prettier', promptHint: 'Opinionated, widely adopted' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('prettier')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        'scripts/format.ts',
        'scripts/format-check.ts',
      ]);
  }
}
