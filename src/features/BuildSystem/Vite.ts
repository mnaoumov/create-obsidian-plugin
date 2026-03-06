import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Vite extends FeatureOption {
  constructor() {
    super({ settingValue: 'vite', promptLabel: 'Vite', promptHint: 'Modern dev server with HMR' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('vite')
      .addFiles([
        'vite.config.ts',
        'scripts/vite.config.ts',
      ]);
  }
}
