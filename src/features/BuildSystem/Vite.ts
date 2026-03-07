import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

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
