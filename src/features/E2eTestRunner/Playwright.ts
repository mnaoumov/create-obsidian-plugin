import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Playwright extends FeatureOption {
  public constructor() {
    super({ promptHint: 'General-purpose browser automation by Microsoft', promptLabel: 'Playwright', settingValue: 'playwright' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@playwright/test')
      .addScript('test:e2e')
      .addFiles([
        'playwright.config.ts',
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts'
      ]);
  }
}
