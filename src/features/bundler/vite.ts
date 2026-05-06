import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Vite extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Modern dev server with HMR', promptLabel: 'Vite', settingValue: 'vite' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('vite')
      .addFiles([
        'vite.config.ts',
        'scripts/vite.config.ts'
      ]);
  }
}
