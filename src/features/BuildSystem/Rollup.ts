import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Rollup extends FeatureOption {
  constructor() {
    super({ settingValue: 'rollup', promptLabel: 'Rollup', promptHint: 'Flexible with plugin ecosystem' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@rollup/plugin-commonjs')
      .addPackage('@rollup/plugin-node-resolve')
      .addPackage('@rollup/plugin-typescript')
      .addPackage('@rollup/plugin-terser')
      .addPackage('rollup')
      .addFiles([
        'rollup.config.mjs',
        'scripts/rollup.config.ts',
      ]);
  }
}
