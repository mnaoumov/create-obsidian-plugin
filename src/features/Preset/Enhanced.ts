import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Enhanced extends FeatureOption {
  constructor() {
    super({ settingValue: 'enhanced', promptLabel: 'Enhanced', promptHint: 'Recommended. Uses obsidian-dev-utils for settings, linting, and more' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@tsconfig/strictest')
      .addPackage('obsidian-dev-utils')
      .addPackage('type-fest')
      .addFiles([
        'src/PluginSettings.ts',
        'src/PluginSettingsManager.ts',
        'src/PluginSettingsTab.ts',
        'src/PluginTypes.ts',
      ])
      .addPartial('non-standalone');
  }
}
