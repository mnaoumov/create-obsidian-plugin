import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class PostCss extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CSS with plugins (autoprefixer, nesting)', promptLabel: 'PostCSS', settingValue: 'postcss' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('autoprefixer')
      .addPackage('postcss')
      .addFiles([
        'postcss.config.mjs',
        'scripts/postcss.config.ts',
        'src/styles/main.css'
      ]);
    if (answers.buildSystem === 'esbuild') {
      builder.addPackage('esbuild-postcss');
    }
    if (answers.buildSystem === 'rollup') {
      builder.addPackage('rollup-plugin-postcss');
    }
    if (answers.buildSystem === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin')
        .addPackage('postcss-loader');
    }
  }
}
