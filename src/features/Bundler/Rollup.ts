import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Rollup extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Flexible with plugin ecosystem', promptLabel: 'Rollup', settingValue: 'rollup' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@rollup/plugin-commonjs')
      .addPackage('@rollup/plugin-node-resolve')
      .addPackage('@rollup/plugin-typescript')
      .addPackage('@rollup/plugin-terser')
      .addPackage('rollup')
      .addFiles([
        'rollup.config.mjs',
        'scripts/rollup.config.ts'
      ]);
  }
}
