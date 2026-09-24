import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Css extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Plain CSS styles', promptLabel: 'CSS', settingValue: 'css' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.css', 'src/styles/styles.d.ts']);
    // Rollup parses anything without a plugin as JavaScript, so the stylesheet `src/main.ts` imports
    // Failed the build with "Expression expected". rollup-plugin-postcss with no PostCSS plugins passes
    // Plain CSS through and extracts it to `styles.css`, as every other bundler does natively or by loader.
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('rollup-plugin-postcss')
        .addPartial('rollup-postcss');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addDepcheckIgnore('css-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
        .addPackage('mini-css-extract-plugin')
        .addPartial('webpack-css-extract');
    }
  }
}
