import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';
import { addToolkitStyles } from './toolkit-styles.ts';

export class PostCss extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CSS with plugins (autoprefixer, nesting)', promptLabel: 'PostCSS', settingValue: 'postcss' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('autoprefixer')
      .addPackage('postcss')
      .addFiles([
        'postcss.config.cjs',
        'scripts/postcss.config.ts',
        'src/styles/main.css'
      ]);
    // The obsidian-dev-toolkit `styles.postcss` runs every stylesheet through the project's `postcss.config.*`.
    if (isFrameworkPreset(answers.preset)) {
      addToolkitStyles(builder, answers.bundler, 'postcss');
      return;
    }

    builder.addFiles(['src/styles/styles.d.ts']);
    if (answers.bundler === 'esbuild') {
      builder.addPackage('esbuild-postcss');
    }
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
        .addPackage('postcss-loader')
        .addDepcheckIgnore('postcss-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
        .addPartial('webpack-css-extract');
    }
  }
}
