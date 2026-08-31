import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Tailwind extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Utility-first CSS framework', promptLabel: 'Tailwind CSS', settingValue: 'tailwind' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      // Tailwind 4 moved the PostCSS plugin into its own package and stopped needing autoprefixer or a
      // JavaScript config file. `tailwindcss`' own default export is now a stub whose only job is to warn
      // That you reached for the wrong package -- which is what the emitted config was calling.
      .addPackage('@tailwindcss/postcss')
      .addPackage('postcss')
      .addPackage('tailwindcss')
      .addFiles([
        'postcss.config.cjs',
        'scripts/postcss.config.ts',
        'src/styles/main.css',
        'src/styles/styles.d.ts'
      ]);
    if (answers.bundler === 'esbuild') {
      builder.addPackage('esbuild-postcss');
    }
    if (answers.bundler === 'rollup') {
      builder.addPackage('rollup-plugin-postcss');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin')
        .addPackage('postcss-loader')
        .addPartial('webpack-css-extract');
    }
  }
}
