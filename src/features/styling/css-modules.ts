import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class CssModules extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Scoped CSS with .module.css files', promptLabel: 'CSS Modules', settingValue: 'css-modules' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addFiles([
        'src/styles/main.module.css',
        'src/styles/css-modules.d.ts'
      ]);
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin');
    }
  }
}
