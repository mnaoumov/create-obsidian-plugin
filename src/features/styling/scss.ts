import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The plugin each bundler needs to read `.scss`.
 *
 * vite and parcel both understand `.scss` out of the box, which is not the same as being able to
 * compile it -- each still needs an implementation present. vite says so outright ("Preprocessor
 * dependency sass-embedded not found"), which is what took `standalone + vite + scss` down. Parcel is
 * worse: it AUTO-INSTALLS `@parcel/transformer-sass` mid-build, so the build quietly depends on the
 * network and on npm's mood at that moment. Declaring it makes the dependency real and the build
 * reproducible.
 */
const SCSS_PLUGINS: Partial<Record<string, string>> = {
  esbuild: 'esbuild-sass-plugin',
  parcel: '@parcel/transformer-sass',
  rollup: 'rollup-plugin-scss',
  vite: 'sass-embedded',
  webpack: 'sass-loader'
};

export class Scss extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Sass/SCSS preprocessor', promptLabel: 'SCSS', settingValue: 'scss' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.scss', 'src/styles/styles.d.ts']);

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
        .addPackage('sass')
        .addPartial('webpack-css-extract');
    }
  }
}
