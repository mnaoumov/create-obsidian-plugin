import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

const BUILD_PLUGINS: Record<string, string> = {
  rollup: '@rollup/plugin-babel',
  vite: 'vite-plugin-solid'
};

export class Solid extends FeatureOption {
  public constructor() {
    super({ jsxImportSource: 'solid-js', promptHint: 'Fine-grained reactivity, no virtual DOM', promptLabel: 'Solid', settingValue: 'solid' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('solid-js')
      .addSentenceCaseBrand('Solid')
      .addFiles([
        'src/solid-components/sample-solid-component.tsx',
        'src/views/sample-solid-view.tsx'
      ]);

    const plugin = BUILD_PLUGINS[answers.bundler];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('@babel/core')
        .addPackage('babel-preset-solid')
        .addFiles([
          'babel.config.mjs',
          'scripts/babel.config.ts'
        ])
        .addPartial('rollup-babel');
    }
    if (answers.bundler === 'esbuild') {
      builder.addPackage('esbuild-plugin-solid');
    }
  }
}
