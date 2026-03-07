import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Jest extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Feature-rich, widely adopted', promptLabel: 'Jest', settingValue: 'jest' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@types/jest')
      .addPackage('jest')
      .addPackage('ts-jest')
      .addScript('test')
      .addFiles([
        'jest.config.ts',
        'src/__tests__/sample.test.ts',
        'scripts/test.ts'
      ]);
  }
}
