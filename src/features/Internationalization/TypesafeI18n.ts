import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class TypesafeI18n extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Type-safe i18n with auto-generated types', promptLabel: 'typesafe-i18n', settingValue: 'typesafe-i18n' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('typesafe-i18n')
      .addFiles([
        'src/i18n/index.ts',
        'src/i18n/en/index.ts',
        '.typesafe-i18n.json'
      ]);
  }
}
