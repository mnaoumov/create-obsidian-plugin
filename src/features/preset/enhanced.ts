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
      .addScript('build:clean')
      .addScript('build:compile')
      // The over-exposure linter from obsidian-dev-utils, which every plugin in the fleet runs. It reports
      // Members exported more widely than anything imports them, so it needs no configuration here.
      .addScript('find-overexposed')
      .addScript('find-overexposed:fix')
      .addScript('version')
      .addFiles([
        // Not gated on the gitHubActions answer, and deliberately so: this attests the assets of a
        // Published RELEASE, and the release flow is the preset's, not CI's. Every plugin in the fleet
        // Ships this workflow and no other -- they have no ci.yml at all.
        '.github/workflows/attest-release-assets.yml',
        'scripts/build.ts',
        'scripts/build-clean.ts',
        'scripts/build-compile.ts',
        'scripts/find-overexposed.ts',
        'scripts/find-overexposed-fix.ts',
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
