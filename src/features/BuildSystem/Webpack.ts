import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

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
  }
}
