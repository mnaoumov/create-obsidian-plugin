import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Tailwind extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Utility-first CSS framework', promptLabel: 'Tailwind CSS', settingValue: 'tailwind' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('autoprefixer')
      .addPackage('postcss')
      .addPackage('tailwindcss')
      .addFiles([
        'postcss.config.mjs',
        'scripts/postcss.config.ts',
        'tailwind.config.ts',
        'scripts/tailwind.config.ts',
        'src/styles/main.css'
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
        .addPackage('postcss-loader');
    }
  }
}
