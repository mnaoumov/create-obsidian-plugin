import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { addAnswerUnitTests } from '../test-runner/sample-unit-tests.ts';

export class Lit extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Web Components with declarative templates', promptLabel: 'Lit', settingValue: 'lit' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('lit')
      .addPartial('ui-view')
      .addSentenceCaseBrand('Lit')
      .addFiles([
        'src/lit-elements/sample-lit-element.ts',
        'src/views/sample-lit-view.ts'
      ]);
    addAnswerUnitTests(builder, answers, ['src/lit-elements/sample-lit-element.test.ts', 'src/views/sample-lit-view.test.ts']);
  }
}
