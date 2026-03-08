import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Enhanced extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Recommended. Uses obsidian-dev-utils for settings, linting, and more', promptLabel: 'Enhanced', settingValue: 'enhanced' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@tsconfig/strictest')
      .addPackage('obsidian-dev-utils')
      .addPackage('type-fest')
      .addScript('dev')
      .addScript('build')
      .addScript('version')
      .addFiles([
        'scripts/build.ts',
        'scripts/dev.ts',
        'scripts/version.ts',
        'src/PluginSettings.ts',
        'src/PluginSettingsManager.ts',
        'src/PluginSettingsTab.ts',
        'src/PluginTypes.ts'
      ])
      .addPartial('enhanced');
  }
}
