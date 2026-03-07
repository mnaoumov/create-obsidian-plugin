import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Cspell extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Configurable spell checker for code', promptLabel: 'cspell', settingValue: 'cspell' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('cspell')
      .addScript('spellcheck')
      .addFiles([
        'cspell.json',
        'scripts/spellcheck.ts'
      ]);
  }
}
