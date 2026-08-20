import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { DEMO_VAULT_TEMPLATE_FILES } from './demo-vault.ts';

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
      .addScript('build:compile')
      .addScript('version')
      .addFiles([
        'scripts/build.ts',
        'scripts/build-compile.ts',
        'scripts/dev.ts',
        'scripts/version.ts',
        'src/PluginSettings.ts',
        'src/PluginSettingsComponent.ts',
        'src/PluginSettingsTab.ts',
        ...DEMO_VAULT_TEMPLATE_FILES
      ])
      .addPartial('odu');
  }
}
