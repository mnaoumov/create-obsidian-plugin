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
      .addPartial('ui-view')
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
        .addDepcheckIgnore('babel-preset-solid', 'named as a string in `scripts/babel.config.ts`, never imported.')
        .addFiles([
          'babel.config.mjs',
          'scripts/babel.config.ts'
        ])
        .addPartial('rollup-babel');
    }
    // Webpack's ts-loader leaves Solid's JSX in place under `jsx: preserve`, so a babel pass after it
    // Compiles it: see `scripts/webpack.config.ts@rule_solid.ejs`.
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('@babel/core')
        .addDepcheckIgnore('@babel/core', 'the peer dependency `babel-loader` loads, never imported.')
        .addPackage('babel-loader')
        .addDepcheckIgnore('babel-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
        .addPackage('babel-preset-solid')
        .addDepcheckIgnore('babel-preset-solid', 'named as a string in `scripts/webpack.config.ts`, never imported.');
    }
    if (answers.bundler === 'esbuild') {
      builder.addPackage('esbuild-plugin-solid');
    }
  }
}
