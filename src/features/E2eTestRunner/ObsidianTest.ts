import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class ObsidianTest extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Tests run inside Obsidian with real app APIs', promptLabel: 'obsidian-test', settingValue: 'obsidian-test' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('obsidian-test')
      .addScript('test:e2e')
      .addFiles([
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts'
      ]);
  }
}
