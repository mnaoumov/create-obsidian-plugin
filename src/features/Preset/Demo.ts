import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Demo extends FeatureOption {
  constructor() {
    super({ settingValue: 'demo', promptLabel: 'Demo', promptHint: 'All features enabled for demonstration. Not for production' });
  }

  override configure(builder: TemplateBuilder): void {
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
        'src/Views/SampleView.ts',
      ])
      .addPartial('non-standalone');
  }
}
