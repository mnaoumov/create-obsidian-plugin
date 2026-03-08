import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Lit extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Web Components with declarative templates', promptLabel: 'Lit', settingValue: 'lit' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('lit')
      .addFiles([
        'src/LitElements/SampleLitElement.ts',
        'src/Views/SampleLitView.ts'
      ]);
  }
}
