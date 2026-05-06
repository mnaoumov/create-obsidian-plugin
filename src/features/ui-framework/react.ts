import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

const BUILD_PLUGINS: Record<string, string> = {
  rollup: '@rollup/plugin-babel',
  vite: '@vitejs/plugin-react'
};

export class React extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Component-based UI with JSX', promptLabel: 'React', settingValue: 'react' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('@types/react')
      .addPackage('@types/react-dom')
      .addPackage('react')
      .addPackage('react-dom')
      .addFiles([
        'src/ReactComponents/SampleReactComponent.tsx',
        'src/Views/SampleReactView.tsx'
      ]);

    const plugin = BUILD_PLUGINS[answers.bundler];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('@babel/core')
        .addPackage('@babel/preset-react')
        .addFiles([
          'babel.config.mjs',
          'scripts/babel.config.ts'
        ]);
    }
  }
}
