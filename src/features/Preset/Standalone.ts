import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Standalone extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Standalone plugin without obsidian-dev-utils dependency', promptLabel: 'Standalone', settingValue: 'standalone' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles(['src/settings.ts']);
  }
}
