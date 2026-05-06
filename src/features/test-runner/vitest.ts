import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Vitest extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast, Vite-native, ESM-first', promptLabel: 'Vitest', settingValue: 'vitest' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('vitest')
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'vitest.config.ts',
        'src/__tests__/sample.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts'
      ]);
  }
}
