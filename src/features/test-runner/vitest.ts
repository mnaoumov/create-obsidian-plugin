import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';
import { addSampleUnitTests } from './sample-unit-tests.ts';

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
      .addDepcheckIgnore(
        'obsidian-test-mocks',
        isFrameworkPreset(answers.preset)
          ? 'aliased and loaded as a setup file by name by `defineObsidianPluginVitestConfig` from @mnaoumov/obsidian-dev-toolkit.'
          : 'aliased and loaded as a setup file by name in `vitest.config.ts`.'
      )
      .addPackage('vitest')
      .addScript('test')
      .addScript('test:watch')
      .addFiles([
        'vitest.config.ts',
        'src/plugin.test.ts',
        'scripts/test.ts',
        'scripts/test-watch.ts',
        // Both presets, not just the framework ones: the emitted `src/plugin.ts` reaches `src/wasm/answer.ts`
        // On every preset when the `wasm` answer is chosen, and registers the answered view, which may be a
        // Single-file component. So every vitest config aliases `.wasm` and `.svelte` / `.vue` to these stubs.
        'scripts/wasm-module-stub.ts',
        'scripts/framework-component-stub.ts',
        // `src/main.test.ts` imports `src/main.ts`, which imports the stylesheet -- and on `tailwind` that
        // File does not exist until the first build. See the stub's own comment.
        'scripts/stylesheet-stub.ts'
      ]);

    addSampleUnitTests(builder, answers);

    if (!isFrameworkPreset(answers.preset)) {
      return;
    }

    // The two demo-vault suites are vitest suites registered by `@mnaoumov/obsidian-dev-toolkit`, and the button suite
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
      // Real plugins reach them once those are set up.
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
