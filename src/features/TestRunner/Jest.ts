import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Jest extends FeatureOption {
  constructor() {
    super({ settingValue: 'jest', promptLabel: 'Jest', promptHint: 'Feature-rich, widely adopted' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@types/jest')
      .addPackage('jest')
      .addPackage('ts-jest')
      .addScript('test')
      .addFiles([
        'jest.config.ts',
        'src/__tests__/sample.test.ts',
        'scripts/test.ts',
      ]);
  }
}
