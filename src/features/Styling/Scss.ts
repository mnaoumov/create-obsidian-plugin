import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

const SCSS_PLUGINS: Partial<Record<string, string>> = {
  esbuild: 'esbuild-sass-plugin',
  rollup: 'rollup-plugin-scss',
  webpack: 'sass-loader'
};

export class Scss extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Sass/SCSS preprocessor', promptLabel: 'SCSS', settingValue: 'scss' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.scss']);

    const plugin = SCSS_PLUGINS[answers.bundler];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.bundler === 'esbuild') {
      builder.addPackage('sass-embedded');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin')
        .addPackage('sass');
    }
  }
}
