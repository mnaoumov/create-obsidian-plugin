import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Css extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Plain CSS styles', promptLabel: 'CSS', settingValue: 'css' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles(['src/styles/main.css']);
  }
}
