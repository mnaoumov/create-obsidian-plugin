import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Jest extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Feature-rich, widely adopted', promptLabel: 'Jest', settingValue: 'jest' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@types/jest')
      .addPackage('jest')
      // `obsidian-test-mocks`' `setup()` writes to `Document.prototype`, `Element.prototype` and
      // `window`, so the suite cannot run in jest's default `node` environment. Jest 30 does not bundle
      // Jsdom, so the environment has to be installed by name.
      .addPackage('jest-environment-jsdom')
      // The runtime `obsidian` module. The npm package is types-only -- `"main": ""` and a tarball of
      // `.d.ts` files -- so without this every test that touches the plugin's own code dies in the
      // Resolver with "Cannot find module 'obsidian'".
      .addPackage('obsidian-test-mocks')
      .addPackage('ts-jest')
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'jest.config.ts',
        'scripts/framework-component-stub.ts',
        'scripts/wasm-module-stub.ts',
        'src/plugin.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts'
      ]);
  }
}
