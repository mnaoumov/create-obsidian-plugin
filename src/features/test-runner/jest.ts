import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';
import { addSampleUnitTests } from './sample-unit-tests.ts';

export class Jest extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Feature-rich, widely adopted', promptLabel: 'Jest', settingValue: 'jest' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    const isFramework = isFrameworkPreset(answers.preset);
    const configNames = isFramework ? '`defineObsidianPluginJestConfig` from @mnaoumov/obsidian-dev-toolkit' : '`jest.config.ts`';
    builder
      .addPackage('@types/jest')
      .addPackage('jest')
      // `obsidian-test-mocks`' `setup()` writes to `Document.prototype`, `Element.prototype` and
      // `window`, so the suite cannot run in jest's default `node` environment. Jest 30 does not bundle
      // Jsdom, so the environment has to be installed by name.
      .addPackage('jest-environment-jsdom')
      .addDepcheckIgnore('jest-environment-jsdom', `named by \`testEnvironment\` in ${configNames}, never imported.`)
      // The runtime `obsidian` module. The npm package is types-only -- `"main": ""` and a tarball of
      // `.d.ts` files -- so without this every test that touches the plugin's own code dies in the
      // Resolver with "Cannot find module 'obsidian'".
      .addPackage('obsidian-test-mocks')
      .addPackage('ts-jest')
      .addDepcheckIgnore('ts-jest', `named as the TypeScript transform by ${configNames}, never imported.`)
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'jest.config.ts',
        'scripts/framework-component-stub.ts',
        'scripts/stylesheet-stub.ts',
        'scripts/wasm-module-stub.ts',
        'src/plugin.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts'
      ]);

    if (isFramework) {
      builder
        .addDepcheckIgnore('obsidian-test-mocks', 'mapped onto `obsidian` and loaded as a setup file by name by `defineObsidianPluginJestConfig` from @mnaoumov/obsidian-dev-toolkit.')
        // The toolkit's own jest setup file imports the lifecycle hooks from it, and it is an optional peer
        // Of the toolkit, so the project installs it.
        .addPackage('@jest/globals')
        .addDepcheckIgnore('@jest/globals', 'imported by `@mnaoumov/obsidian-dev-toolkit/jest-setup`, which `defineObsidianPluginJestConfig` loads.');
    }

    addSampleUnitTests(builder, answers);
  }
}