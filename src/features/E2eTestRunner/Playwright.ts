import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Playwright extends FeatureOption {
  constructor() {
    super({ settingValue: 'playwright', promptLabel: 'Playwright', promptHint: 'General-purpose browser automation by Microsoft' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@playwright/test')
      .addScript('test:e2e')
      .addFiles([
        'playwright.config.ts',
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts',
      ]);
  }
}
