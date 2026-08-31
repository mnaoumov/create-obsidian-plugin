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
    // Rollup cannot import a stylesheet at all without a plugin. The emitted `src/main.ts` imports
    // `main.module.css`, and rollup answered with "Expression expected (Note that you need plugins to
    // Import files that are not JavaScript)". rollup-plugin-postcss scopes `*.module.css` by default
    // And leaves an ordinary stylesheet alone, which is what a second, forced styling answer needs.
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('rollup-plugin-postcss')
        .addPartial('rollup-postcss');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin')
        .addPartial('webpack-css-extract');
    }
  }
}
