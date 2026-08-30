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
      // Not a testing dependency here, despite the name. The obsidian-dev-utils esbuild bundler
      // STATICALLY imports it from its copy-to-obsidian-plugins-folder plugin, so a preset built on
      // Obsidian-dev-utils cannot run its own build without it. It used to be added only alongside
      // Vitest, which left every such preset on any other test runner dying at
      // "Cannot find module 'obsidian-integration-testing'" -- and obsidian-dev-utils declares it as an
      // Optional peer, which is exactly what makes npm leave it out without a word.
      .addPackage('obsidian-integration-testing')
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
        'src/plugin-settings.ts',
        'src/plugin-settings-component.ts',
        'src/plugin-settings-tab.ts',
        ...DEMO_VAULT_TEMPLATE_FILES
      ])
      .addPartial('odu');
  }
}
