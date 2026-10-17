import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

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

    // The obsidian-dev-toolkit adapters compile Solid's JSX with `babel-preset-solid`, loaded from the project.
    if (isFrameworkPreset(answers.preset)) {
      builder
        .addBuildFramework('solid')
        .addTsconfigExtends('@mnaoumov/obsidian-dev-toolkit/tsconfig/solid.json')
        .addPackage('@babel/core')
        .addDepcheckIgnore('@babel/core', 'loaded by obsidian-dev-toolkit to compile Solid\'s JSX.')
        .addPackage('babel-preset-solid')
        .addDepcheckIgnore('babel-preset-solid', 'loaded by obsidian-dev-toolkit to compile Solid\'s JSX.');
      return;
    }

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
    // Parcel compiles JSX for a React-style runtime, which Solid has not got: see `babel.config.json.ejs`.
    if (answers.bundler === 'parcel') {
      builder
        .addPackage('babel-preset-solid')
        .addDepcheckIgnore('babel-preset-solid', 'named as a string in `babel.config.json`, never imported.')
        .addFiles(['babel.config.json']);
    }
    if (answers.bundler === 'esbuild') {
      builder.addPackage('esbuild-plugin-solid');
    }
  }
}
