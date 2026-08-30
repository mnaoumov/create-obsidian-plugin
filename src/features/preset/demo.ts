import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { DEMO_VAULT_TEMPLATE_FILES } from './demo-vault.ts';

export class Demo extends FeatureOption {
  public constructor() {
    super({ promptHint: 'All features enabled for demonstration', promptLabel: 'Demo', settingValue: 'demo' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@tsconfig/strictest')
      .addPackage('moment')
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
        'src/modals/sample-form-modal.ts',
        'src/modals/sample-suggest-modal.ts',
        'src/plugin-settings.ts',
        'src/plugin-settings-component.ts',
        'src/plugin-settings-tab.ts',
        'src/views/sample-view.ts',
        ...DEMO_VAULT_TEMPLATE_FILES
      ])
      .addPartial('odu');
  }
}
