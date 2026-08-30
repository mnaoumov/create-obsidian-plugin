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
      .addPackage('ts-loader')
      .addFiles([
        'webpack.config.ts',
        'scripts/webpack.config.ts'
      ]);

    // Marks this as a bundler driven from the command line, so it shares one build script with the
    // Other three instead of each carrying a near-identical copy. esbuild is the exception: it is
    // Driven through its API, and obsidian-dev-utils supplies a build for it.
    builder.addPartial('cli-bundler');
  }
}
