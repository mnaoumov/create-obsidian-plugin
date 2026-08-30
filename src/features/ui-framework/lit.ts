import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Lit extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Web Components with declarative templates', promptLabel: 'Lit', settingValue: 'lit' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('lit')
      .addSentenceCaseBrand('Lit')
      .addFiles([
        'src/lit-elements/sample-lit-element.ts',
        'src/views/sample-lit-view.ts'
      ]);
  }
}
