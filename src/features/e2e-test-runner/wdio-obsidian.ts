import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class WdioObsidian extends FeatureOption {
  public constructor() {
    super({ promptHint: 'WebdriverIO service for Obsidian, multi-version & CI/CD', promptLabel: 'wdio-obsidian', settingValue: 'wdio-obsidian' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@wdio/cli')
      // Declared rather than reached through the wdio dependency tree. The emitted `tsconfig.json`
      // Names both in its `types` array -- that is where the `browser`, `describe`, `it` and `expect`
      // Globals and the `WebdriverIO` namespace come from -- and a config should not point at a
      // Package that is only in the tree because something else happens to depend on it.
      .addPackage('@wdio/globals')
      .addPackage('@wdio/mocha-framework')
      .addPackage('expect-webdriverio')
      .addPackage('wdio-obsidian-service')
      .addScript('test:e2e')
      .addFiles([
        'wdio.conf.ts',
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts'
      ])
      .addPartial('has-e2e');
  }
}
