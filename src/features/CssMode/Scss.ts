import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

const SCSS_PLUGINS: Partial<Record<string, string>> = {
  esbuild: 'esbuild-sass-plugin',
  rollup: 'rollup-plugin-scss'
};

export class Scss extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Sass/SCSS preprocessor', promptLabel: 'SCSS', settingValue: 'scss' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.scss']);

    const plugin = SCSS_PLUGINS[answers.buildSystem];
    if (plugin) {
      builder.addPackage(plugin);
    }
  }
}
