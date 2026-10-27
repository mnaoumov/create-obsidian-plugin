import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Webpack extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Mature bundler with broad plugin support', promptLabel: 'Webpack', settingValue: 'webpack' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('webpack')
      .addPackage('webpack-cli')
      .addDepcheckIgnore('webpack-cli', 'what the build script runs as the `webpack` command.')
      .addFiles([
        'webpack.config.ts',
        'scripts/webpack.config.ts'
      ]);

    // On the framework presets obsidian-dev-toolkit's webpack plugin builds the plugin, and the scripts only run the
    // Webpack command line. The TypeScript step is esbuild-based, which TypeScript 7 does not break. Standalone shares
    // One build script with the other command-line bundlers.
    if (isFrameworkPreset(answers.preset)) {
      builder
        .addPackage('esbuild-loader')
        .addDepcheckIgnore('esbuild-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
        .addPartial('adapter-cli');
      return;
    }

    builder
      .addPackage('terser-webpack-plugin')
      .addPackage('ts-loader')
      .addDepcheckIgnore('ts-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
      .addPartial('cli-bundler');
  }
}
