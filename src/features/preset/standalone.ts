import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Standalone extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Standalone plugin without the @mnaoumov library dependencies', promptLabel: 'Standalone', settingValue: 'standalone' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addScript('dev')
      .addScript('build')
      .addScript('version')
      .addFiles([
        'scripts/build.ts',
        'scripts/dev.ts',
        'scripts/version.ts',
        'src/settings.ts'
      ]);
  }
}
