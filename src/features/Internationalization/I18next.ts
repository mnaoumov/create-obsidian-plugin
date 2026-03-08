import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class I18next extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Popular i18n framework with JSON translations', promptLabel: 'i18next', settingValue: 'i18next' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('i18next')
      .addFiles([
        'src/i18n/index.ts',
        'src/i18n/locales/en.json'
      ]);
  }
}
