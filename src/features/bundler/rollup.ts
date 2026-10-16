import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

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

    // Marks this as a bundler driven from the command line, so it shares one build script with the
    // Other three instead of each carrying a near-identical copy. esbuild is the exception: it is driven
    // Through its API, and on the framework presets obsidian-dev-toolkit supplies its build. The toolkit has
    // No builder for this bundler yet, so every preset runs the CLI from the project's own script.
    builder.addPartial('cli-bundler');
  }
}
