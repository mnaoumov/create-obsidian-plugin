import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Standalone extends FeatureOption {
  constructor() {
    super({ settingValue: 'standalone', promptLabel: 'Standalone', promptHint: 'Standalone plugin without obsidian-dev-utils dependency' });
  }

  override configure(builder: TemplateBuilder): void {
    builder.addFiles(['src/settings.ts']);
  }
}
