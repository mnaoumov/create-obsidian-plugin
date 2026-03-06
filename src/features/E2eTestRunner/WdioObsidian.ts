import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class WdioObsidian extends FeatureOption {
  constructor() {
    super({ settingValue: 'wdio-obsidian', promptLabel: 'wdio-obsidian', promptHint: 'WebdriverIO service for Obsidian, multi-version & CI/CD' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@wdio/cli')
      .addPackage('@wdio/mocha-framework')
      .addPackage('wdio-obsidian-service')
      .addScript('test:e2e')
      .addFiles([
        'wdio.conf.ts',
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts',
      ]);
  }
}
