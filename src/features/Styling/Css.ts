import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Css extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Plain CSS styles', promptLabel: 'CSS', settingValue: 'css' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.css']);
    if (answers.buildSystem === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin');
    }
  }
}
