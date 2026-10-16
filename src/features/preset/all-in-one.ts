import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { DEMO_VAULT_TEMPLATE_FILES } from './demo-vault.ts';

export class AllInOne extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Recommended. Uses @mnaoumov/obsidian-lib and its toolkits for settings, linting, and more', promptLabel: 'Enhanced', settingValue: 'all-in-one' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@tsconfig/strictest')
      // The runtime library the emitted plugin code imports, and the two toolkits every scripts/*.ts
      // Wraps: the Obsidian one for the build, lint, version and demo-vault tooling, the generic one for
      // The CLI wrapper, the gate and the remaining runners.
      .addPackage('@mnaoumov/obsidian-lib')
      .addPackage('@mnaoumov/obsidian-dev-toolkit')
      .addPackage('@mnaoumov/typescript-dev-toolkit')
      // Not a testing dependency here, despite the name. obsidian-dev-toolkit's esbuild bundler
      // STATICALLY imports it from its copy-to-obsidian-plugins-folder plugin, so a preset built on
      // The toolkit cannot run its own build without it. It used to be added only alongside
      // Vitest, which left every such preset on any other test runner dying at
      // "Cannot find module 'obsidian-integration-testing'" -- and the toolkit declares it as an
      // Optional peer, which is exactly what makes npm leave it out without a word.
      .addPackage('obsidian-integration-testing')
      .addScript('dev')
      .addScript('build')
      .addScript('build:clean')
      .addScript('build:compile')
      // The over-exposure linter from typescript-dev-toolkit, which every plugin compared here runs. It reports
      // Members exported more widely than anything imports them, so it needs no configuration here.
      .addScript('find-overexposed')
      .addScript('find-overexposed:fix')
      .addScript('version')
      // The release preflight's checks, reachable before committing. typescript-dev-toolkit's `gate()` requires only
      // `build`, which this preset always registers, and skips every other check the project has no script for.
      .addScript('gate')
      .addFiles([
        // Not gated on the gitHubActions answer, and deliberately so: this attests the assets of a
        // Published RELEASE, and the release flow is the preset's, not CI's. Every plugin compared here
        // Ships this workflow -- they have no ci.yml at all.
        '.github/workflows/attest-release-assets.yml',
        // Not gated on the answers either: the shared ESLint config's `obsidianmd/validate-license` compares
        // The LICENSE year with the current one, so without this bump every project turns red on 1 January.
        '.github/workflows/update-license-year.yml',
        'scripts/build.ts',
        'scripts/build-clean.ts',
        'scripts/build-compile.ts',
        'scripts/find-overexposed.ts',
        'scripts/find-overexposed-fix.ts',
        'scripts/dev.ts',
        'scripts/gate.ts',
        'scripts/version.ts',
        'src/plugin-settings.ts',
        'src/plugin-settings-component.ts',
        'src/plugin-settings-tab.ts',
        ...DEMO_VAULT_TEMPLATE_FILES
      ])
      .addPartial('framework');
  }
}
