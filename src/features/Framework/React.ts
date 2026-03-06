import type { Answers } from '../../Answers.ts';
import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

const BUILD_PLUGINS: Record<string, string> = {
  rollup: '@rollup/plugin-babel',
  vite: '@vitejs/plugin-react',
};

export class React extends FeatureOption {
  constructor() {
    super({ settingValue: 'react', promptLabel: 'React', promptHint: 'Component-based UI with JSX' });
  }

  override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('@types/react')
      .addPackage('@types/react-dom')
      .addPackage('react')
      .addPackage('react-dom')
      .addFiles([
        'src/ReactComponents/SampleReactComponent.tsx',
        'src/Views/SampleReactView.tsx',
      ]);

    const plugin = BUILD_PLUGINS[answers.buildSystem];
    if (plugin) {
      builder.addPackage(plugin);
    }
    if (answers.buildSystem === 'rollup') {
      builder.addPackage('@babel/preset-react');
    }
  }
}
