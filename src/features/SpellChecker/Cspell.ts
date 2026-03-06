import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Cspell extends FeatureOption {
  constructor() {
    super({ settingValue: 'cspell', promptLabel: 'cspell', promptHint: 'Configurable spell checker for code' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('cspell')
      .addScript('spellcheck')
      .addFiles([
        'cspell.json',
        'scripts/spellcheck.ts',
      ]);
  }
}
