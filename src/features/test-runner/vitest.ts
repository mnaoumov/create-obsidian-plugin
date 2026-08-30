import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isOduPreset } from '../preset/is-odu-preset.ts';

export class Vitest extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast, Vite-native, ESM-first', promptLabel: 'Vitest', settingValue: 'vitest' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('vitest')
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'vitest.config.ts',
        'src/Plugin.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts'
      ]);

    if (!isOduPreset(answers.preset)) {
      return;
    }

    // The two demo-vault suites are vitest suites registered by `obsidian-dev-utils`, and the button suite
    // Additionally drives a real Obsidian through `obsidian-integration-testing`. Both therefore need the
    // Project-based vitest config, which is also what gives the coverage suite its `integration-tests:no-app`
    // Project. A suite file whose suffix matches no declared project is collected by nothing and reports
    // Nothing, which looks exactly like passing.
    builder
      .addPackage('@vitest/coverage-v8')
      // The `unit-tests` project `defineObsidianPluginVitestConfig` declares runs in the jsdom
      // Environment, and vitest resolves that from the consuming project, not from obsidian-dev-utils.
      .addPackage('jsdom')
      .addPackage('obsidian-integration-testing')
      // The `unit-tests` project's `setupFiles` point at `obsidian-test-mocks/vitest-setup`, which the
      // Consuming project has to provide.
      .addPackage('obsidian-test-mocks')
      .addScript('test:coverage')
      .addScript('test:integration')
      .addScript('test:integration:demo-vault')
      .addScript('test:integration:no-app')
      .addFiles([
        'scripts/demo-vault-global-setup.ts',
        'scripts/test-coverage.ts',
        'scripts/test-integration.ts',
        'scripts/test-integration-demo-vault.ts',
        'scripts/test-integration-no-app.ts',
        'scripts/vitest-config.ts',
        'src/demo-vault-buttons.demo-vault.integration.test.ts',
        'src/demo-vault.no-app.integration.test.ts'
      ]);
  }
}
