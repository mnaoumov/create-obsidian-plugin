import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Rollup extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Flexible with plugin ecosystem', promptLabel: 'Rollup', settingValue: 'rollup' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('@rollup/plugin-commonjs')
      .addPackage('@rollup/plugin-node-resolve')
      .addPackage('rollup')
      .addFiles([
        'rollup.config.mjs',
        'scripts/rollup.config.ts'
      ]);

    // On the framework presets obsidian-dev-toolkit's rollup plugin builds the plugin, and the scripts only run the
    // Rollup command line. The TypeScript step is esbuild-based, which TypeScript 7 does not break. Standalone shares
    // One build script with the other command-line bundlers.
    if (isFrameworkPreset(answers.preset)) {
      builder
        .addPackage('esbuild')
        .addDepcheckIgnore('esbuild', 'the peer dependency `rollup-plugin-esbuild` runs; nothing imports it.')
        .addPackage('rollup-plugin-esbuild')
        .addPartial('adapter-cli');
      return;
    }

    builder
      .addPackage('@rollup/plugin-typescript')
      .addPackage('@rollup/plugin-terser')
      .addPartial('cli-bundler');
  }
}
