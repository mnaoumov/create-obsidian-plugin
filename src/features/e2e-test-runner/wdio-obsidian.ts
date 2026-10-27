import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class WdioObsidian extends FeatureOption {
  public constructor() {
    super({ promptHint: 'WebdriverIO service for Obsidian, multi-version & CI/CD', promptLabel: 'wdio-obsidian', settingValue: 'wdio-obsidian' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('@wdio/cli')
      .addDepcheckIgnore('@wdio/cli', 'run as the `wdio` CLI by `scripts/test-e2e.ts`.')
      // Declared rather than reached through the wdio dependency tree. The emitted `tsconfig.json`
      // Names both in its `types` array -- that is where the `browser`, `describe`, `it` and `expect`
      // Globals and the `WebdriverIO` namespace come from -- and a config should not point at a
      // Package that is only in the tree because something else happens to depend on it.
      .addPackage('@wdio/globals')
      // The config names `runner: 'local'`, which wdio loads by package name.
      .addPackage('@wdio/local-runner')
      .addDepcheckIgnore('@wdio/local-runner', 'loaded by name by wdio for the config\'s `runner: \'local\'`.')
      .addPackage('@wdio/mocha-framework')
      .addPackage('expect-webdriverio')
      .addPackage('wdio-obsidian-service')
      .addScript('test:e2e')
      .addFiles([
        'e2e/sample.spec.ts',
        'scripts/test-e2e.ts'
      ])
      .addPartial('has-e2e');

    // The framework presets' config is obsidian-dev-toolkit's `defineWdioObsidianConfig`, which names the `obsidian`
    // Reporter. It is an `.mts` file because the toolkit is imported as ESM, and the root `./*.ts` glob does not
    // Reach it, so the tsconfig names it.
    if (isFrameworkPreset(answers.preset)) {
      builder
        .addPackage('wdio-obsidian-reporter')
        .addDepcheckIgnore('wdio-obsidian-reporter', 'loaded by name by wdio for the `obsidian` reporter `defineWdioObsidianConfig` names.')
        .addFiles(['wdio.conf.mts']);
      return;
    }

    builder.addFiles(['wdio.conf.ts']);
  }
}
