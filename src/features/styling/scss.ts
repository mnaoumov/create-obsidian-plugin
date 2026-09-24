import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isDevUtilsPreset } from '../preset/is-dev-utils-preset.ts';

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

/**
 * Why depcheck cannot see a bundler's SCSS package used, for the bundlers that reach it by name.
 *
 * esbuild and rollup import theirs from the build script, so they have no entry -- and on the
 * obsidian-dev-utils presets `esbuild-sass-plugin` is not declared at all.
 */
const SCSS_PLUGIN_DEPCHECK_REASONS: Partial<Record<string, string>> = {
  parcel: 'resolved by name by `@parcel/config-default` for `.scss`; nothing imports it.',
  vite: 'the Sass compiler vite resolves by name for `.scss`; nothing imports it.',
  webpack: 'named as a loader string in `scripts/webpack.config.ts`.'
};

export class Scss extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Sass/SCSS preprocessor', promptLabel: 'SCSS', settingValue: 'scss' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.scss', 'src/styles/styles.d.ts']);

    // Obsidian-dev-utils' esbuild build depends on and registers `esbuild-sass-plugin` itself, so the
    // Project's build never names it there.
    const plugin = isDevUtilsPreset(answers.preset) && answers.bundler === 'esbuild' ? undefined : SCSS_PLUGINS[answers.bundler];
    if (plugin) {
      builder.addPackage(plugin);
      const depcheckReason = SCSS_PLUGIN_DEPCHECK_REASONS[answers.bundler];
      if (depcheckReason) {
        builder.addDepcheckIgnore(plugin, depcheckReason);
      }
    }
    if (answers.bundler === 'esbuild') {
      builder
        .addPackage('sass-embedded')
        .addDepcheckIgnore('sass-embedded', 'the Sass compiler `esbuild-sass-plugin` peers on; nothing imports it directly.');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addDepcheckIgnore('css-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
        .addPackage('mini-css-extract-plugin')
        .addPackage('sass')
        .addDepcheckIgnore('sass', 'the Sass compiler `sass-loader` resolves by name; nothing imports it directly.')
        .addPartial('webpack-css-extract');
    }
  }
}
