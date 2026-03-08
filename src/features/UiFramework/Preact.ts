import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-plugin-preact',
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
      .addFiles([
        'src/PreactComponents/SamplePreactComponent.tsx',
        'src/Views/SamplePreactView.tsx'
      ]);

    const plugin = BUILD_PLUGINS[answers.buildSystem];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.buildSystem === 'rollup') {
      builder
        .addPackage('@babel/core')
        .addPackage('@babel/plugin-transform-react-jsx')
        .addFiles([
          'babel.config.mjs',
          'scripts/babel.config.ts'
        ]);
    }
  }
}
