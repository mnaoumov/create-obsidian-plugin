import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class WdioObsidian extends FeatureOption {
  public constructor() {
    super({ promptHint: 'WebdriverIO service for Obsidian, multi-version & CI/CD', promptLabel: 'wdio-obsidian', settingValue: 'wdio-obsidian' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@wdio/cli')
      .addPackage('@wdio/mocha-framework')
      .addPackage('wdio-obsidian-service')
      .addScript('test:e2e')
      .addFiles([
        'wdio.conf.ts',
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts'
      ]);
  }
}
