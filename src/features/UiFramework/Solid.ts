import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

const BUILD_PLUGINS: Record<string, string> = {
  rollup: '@rollup/plugin-babel',
  vite: 'vite-plugin-solid'
};

export class Solid extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fine-grained reactivity, no virtual DOM', promptLabel: 'Solid', settingValue: 'solid' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('solid-js')
      .addFiles([
        'src/SolidComponents/SampleSolidComponent.tsx',
        'src/Views/SampleSolidView.tsx'
      ]);

    const plugin = BUILD_PLUGINS[answers.buildSystem];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.buildSystem === 'rollup') {
      builder
        .addPackage('@babel/core')
        .addPackage('babel-preset-solid')
        .addFiles([
          'babel.config.mjs',
          'scripts/babel.config.ts'
        ]);
    }
    if (answers.buildSystem === 'esbuild') {
      builder.addPackage('esbuild-plugin-solid');
    }
  }
}
