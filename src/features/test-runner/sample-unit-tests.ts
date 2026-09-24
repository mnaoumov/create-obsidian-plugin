import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { isDevUtilsPreset } from '../preset/is-dev-utils-preset.ts';

/**
 * Registers the sample unit tests beside `src/plugin.test.ts`, which each runner registers itself.
 *
 * Each one asserts wiring the emitted plugin really has, never a restatement of a literal: a test that
 * passes on every combination while proving nothing is the failure `src/plugin.test.ts` was rewritten
 * to escape. So what ships depends on what is there to say:
 *
 * - `src/main.test.ts` on every preset: the default export Obsidian loads is the plugin class.
 * - `src/plugin-settings-component.test.ts` on the obsidian-dev-utils presets: the component takes its
 *   defaults from the emitted settings class, and on `demo` a typed setting survives a save and a load.
 * - `src/plugin-settings.test.ts` on `demo` only, where `TypedItem.deserialize` is behavior. On
 *   `enhanced` the settings class is one default value, and a test of it would restate the source.
 *
 * There is no `src/plugin-settings-tab.test.ts`. The one true thing to say about the tab is that it
 * binds every setting, and rendering a row reaches `bind`, which throws on the test-mocks components
 * unless it is spied on -- and jest running ES modules has no `jest` global to spy with.
 *
 * Both runners call this, so the two cannot drift apart. The per-runner difference is only the
 * `vitest` import, which each template takes from a `test-imports` section.
 *
 * @param builder - The template builder.
 * @param answers - The answers.
 */
export function addSampleUnitTests(builder: TemplateBuilder, answers: Answers): void {
  builder.addFiles(['src/main.test.ts']);

  if (!isDevUtilsPreset(answers.preset)) {
    return;
  }

  builder.addFiles(['src/plugin-settings-component.test.ts']);

  if (answers.preset === 'demo') {
    builder.addFiles(['src/plugin-settings.test.ts']);
  }
}
