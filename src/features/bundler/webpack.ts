import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Webpack extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Mature bundler with broad plugin support', promptLabel: 'Webpack', settingValue: 'webpack' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('webpack')
      .addPackage('webpack-cli')
      .addDepcheckIgnore('webpack-cli', 'what `npx webpack` in the build script runs.')
      .addPackage('terser-webpack-plugin')
      .addPackage('ts-loader')
      .addDepcheckIgnore('ts-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
      .addFiles([
        'webpack.config.ts',
        'scripts/webpack.config.ts'
      ]);

    // Marks this as a bundler driven from the command line, so it shares one build script with the
    // Other three instead of each carrying a near-identical copy. esbuild is the exception: it is driven
    // Through its API, and on the dev-utils presets obsidian-dev-toolkit supplies its build. The toolkit has
    // No builder for this bundler yet, so every preset runs the CLI from the project's own script.
    builder.addPartial('cli-bundler');
  }
}
