import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Vitest extends FeatureOption {
  constructor() {
    super({ settingValue: 'vitest', promptLabel: 'Vitest', promptHint: 'Fast, Vite-native, ESM-first' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('vitest')
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'vitest.config.ts',
        'src/__tests__/sample.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts',
      ]);
  }
}
