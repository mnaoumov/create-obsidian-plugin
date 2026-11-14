import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

/**
 * Registers the unit tests of an answer's own modules, beside the modules they test.
 *
 * Only the framework presets register `test:coverage`, whose threshold is 100%, so an answer that emits a module
 * there and no test for it leaves the project failing its own gate. Each answer calls this from its `configure`,
 * which also runs when `demo` forces the answer in. The tests are written for both runners: the only difference is
 * the `vitest` import, which each template takes from a `test-imports` section.
 *
 * @param builder - The template builder.
 * @param answers - The answers.
 * @param files - The test files, by their emitted paths.
 */
export function addAnswerUnitTests(builder: TemplateBuilder, answers: Answers, files: readonly string[]): void {
  if (isFrameworkPreset(answers.preset) && answers.testRunner !== 'none') {
    builder.addFiles(files);
  }
}

/**
 * Registers the sample unit tests beside `src/plugin.test.ts`, which each runner registers itself.
 *
 * Each one asserts wiring the emitted plugin really has, never a restatement of a literal: a test that
 * passes on every combination while proving nothing is the failure `src/plugin.test.ts` was rewritten
 * to escape. So what ships depends on what is there to say:
 *
 * - `src/main.test.ts` on every preset: the default export Obsidian loads is the plugin class.
 * - `src/plugin-settings-component.test.ts` on the toolkit presets: the component takes its
 *   defaults from the emitted settings class, and on `demo` a typed setting survives a save and a load.
 * - `src/plugin-settings.test.ts` on `demo` only, where `TypedItem.deserialize` is behavior. On
 *   `all-in-one` the settings class is one default value, and a test of it would restate the source.
 *
 * - `src/plugin-settings-tab.test.ts` on the toolkit presets: rendering each row binds it to its setting.
 *   The test replaces `bind` on the instance rather than spying on it, because the real one throws on the
 *   test-mocks components and jest running ES modules has no `jest` global to spy with. On `demo`, whose
 *   tab builds every `SettingEx` component there is through `displayLegacy()`, it also runs each row's
 *   own callbacks: its buttons, file pickers, converters and change handlers.
 * - On `demo`, a test for each of its sample modals and for its sample view.
 *
 * On these presets `src/plugin.test.ts` loads the plugin once and runs its sample commands, and on `demo`
 * drives every handler the plugin registers. With the tests above that holds a scaffold at the 100%
 * `test:coverage` threshold.
 *
 * Both runners call this, so the two cannot drift apart. The per-runner difference is only the
 * `vitest` import, which each template takes from a `test-imports` section.
 *
 * @param builder - The template builder.
 * @param answers - The answers.
 */
export function addSampleUnitTests(builder: TemplateBuilder, answers: Answers): void {
  builder.addFiles(['src/main.test.ts']);

  if (!isFrameworkPreset(answers.preset)) {
    return;
  }

  builder
    .addFiles(['src/plugin-settings-component.test.ts', 'src/plugin-settings-tab.test.ts'])
    // The settings-component test drives the component through `AsyncEvents` and `noopAsync`.
    .addPackage('@mnaoumov/typescript-lib');

  if (answers.preset !== 'demo') {
    return;
  }

  builder
    .addFiles([
      'src/modals/sample-form-modal.test.ts',
      'src/modals/sample-suggest-modal.test.ts',
      'src/plugin-settings.test.ts',
      'src/views/sample-view.test.ts'
    ])
    // `strictProxy` stands in for the plugin the demo settings-component test hands the component.
    .addPackage('@mnaoumov/typescript-test-toolkit');
}
