import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

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
