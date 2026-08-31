import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The package each bundler needs to compile Preact JSX. Bundlers absent from the table need none.
 *
 * esbuild is deliberately absent: it compiles Preact JSX from its own `jsx: 'automatic'` +
 * `jsxImportSource: 'preact'` options, which `scripts/build.ts_standalone@options_preact.ejs` already
 * emits. It used to name `esbuild-plugin-preact` here -- a package that **does not exist on npm** and
 * that no template ever imported, so `preact` with the default bundler could not `npm install` at all,
 * on every preset. `resolveVersions` falls back to the literal `latest` when a registry lookup fails
 * (so that generating offline still works), which is what let a name that resolves to nothing reach
 * `package.json` looking ordinary.
 */
const BUILD_PLUGINS: Record<string, string> = {
  rollup: '@rollup/plugin-babel',
  vite: '@preact/preset-vite'
};

export class Preact extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Lightweight React alternative (3kB)', promptLabel: 'Preact', settingValue: 'preact' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('preact')
      .addSentenceCaseBrand('Preact')
      .addFiles([
        'src/preact-components/sample-preact-component.tsx',
        'src/views/sample-preact-view.tsx'
      ]);

    const plugin = BUILD_PLUGINS[answers.bundler];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('@babel/core')
        .addPackage('@babel/plugin-transform-react-jsx')
        .addFiles([
          'babel.config.mjs',
          'scripts/babel.config.ts'
        ])
        .addPartial('rollup-babel');
    }
  }
}
