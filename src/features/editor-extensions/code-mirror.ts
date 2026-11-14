import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { addAnswerUnitTests } from '../test-runner/sample-unit-tests.ts';

export class CodeMirror extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CodeMirror 6 state fields, view plugins, decorations', promptLabel: 'CodeMirror', settingValue: 'codemirror' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // Not `@codemirror/language`: no sample imports it, and Obsidian peers only on these two.
    builder
      .addPackage('@codemirror/state')
      .addPackage('@codemirror/view')
      .addFiles([
        'src/editor-extensions/sample-state-field.ts',
        'src/editor-extensions/sample-view-plugin.ts',
        'src/editor-extensions/sample-widget.ts',
        'src/editor-suggests/sample-editor-suggest.ts'
      ]);
    addAnswerUnitTests(builder, answers, [
      'src/editor-extensions/sample-state-field.test.ts',
      'src/editor-extensions/sample-view-plugin.test.ts',
      'src/editor-extensions/sample-widget.test.ts',
      'src/editor-suggests/sample-editor-suggest.test.ts'
    ]);
  }
}
