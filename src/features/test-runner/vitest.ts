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
      // The unit-test suites run in the jsdom environment, and vitest resolves that from the consuming
      // Project rather than from vitest itself.
      .addPackage('jsdom')
      // The runtime `obsidian` module, plus the setup file that patches the prototypes and globals
      // Obsidian installs. The npm package is types-only -- `"main": ""` and a tarball of `.d.ts` files
      // -- so without this every test that touches the plugin's own code dies in the resolver.
      .addPackage('obsidian-test-mocks')
      .addPackage('vitest')
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'vitest.config.ts',
        'src/plugin.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts',
        // Both presets, not just the odu ones: the emitted `src/plugin.ts` reaches `src/wasm/answer.ts`
        // On every preset when the `wasm` answer is chosen, so every vitest config aliases `.wasm` to
        // This stub. `framework-component-stub.ts` is odu-only because only those presets' `plugin.ts`
        // Reaches a single-file component.
        'scripts/wasm-module-stub.ts'
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
      .addScript('test:coverage')
      .addScript('test:integration')
      // The three below are declared by `defineObsidianPluginVitestConfig` and are deliberately NOT run
      // By `test:integration`, which says why: one drives a real Obsidian install and one needs a
      // Provisioned Android emulator, so a freshly generated project would fail its own aggregate task
      // On any machine that has neither. They still get their own script, because that is how the
      // Fleet reaches them once those are set up.
      .addScript('test:integration:android')
      .addScript('test:integration:demo-vault')
      .addScript('test:integration:desktop')
      .addScript('test:integration:desktop:performance')
      .addScript('test:integration:no-app')
      .addFiles([
        'scripts/test-integration-android.ts',
        'scripts/test-integration-desktop.ts',
        'scripts/test-integration-desktop-performance.ts',
        'scripts/demo-vault-global-setup.ts',
        'scripts/framework-component-stub.ts',
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
