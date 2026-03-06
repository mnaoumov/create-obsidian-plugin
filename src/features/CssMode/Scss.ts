import type { Answers } from '../../Answers.ts';
import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

const SCSS_PLUGINS: Partial<Record<string, string>> = {
  esbuild: 'esbuild-sass-plugin',
  rollup: 'rollup-plugin-scss',
};

export class Scss extends FeatureOption {
  constructor() {
    super({ settingValue: 'scss', promptLabel: 'SCSS', promptHint: 'Sass/SCSS preprocessor' });
  }

  override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles(['src/styles/main.scss']);

    const plugin = SCSS_PLUGINS[answers.buildSystem];
    if (plugin) {
      builder.addPackage(plugin);
    }
  }
}
