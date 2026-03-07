import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Demo extends FeatureOption {
  public constructor() {
    super({ promptHint: 'All features enabled for demonstration. Not for production', promptLabel: 'Demo', settingValue: 'demo' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@tsconfig/strictest')
      .addPackage('moment', '2.29.4')
      .addPackage('obsidian-dev-utils')
      .addPackage('type-fest')
      .addFiles([
        'src/Modals/SampleModal.ts',
        'src/PluginSettings.ts',
        'src/PluginSettingsManager.ts',
        'src/PluginSettingsTab.ts',
        'src/PluginTypes.ts',
        'src/Views/SampleView.ts'
      ])
      .addPartial('uses-obsidian-dev-utils');
  }
}
