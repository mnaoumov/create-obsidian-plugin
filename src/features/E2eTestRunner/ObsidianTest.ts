import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class ObsidianTest extends FeatureOption {
  constructor() {
    super({ settingValue: 'obsidian-test', promptLabel: 'obsidian-test', promptHint: 'Tests run inside Obsidian with real app APIs' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('obsidian-test')
      .addScript('test:e2e')
      .addFiles([
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts',
      ]);
  }
}
