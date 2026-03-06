import type { Answers } from '../../Answers.ts';
import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-plugin-vue3',
  rollup: 'rollup-plugin-vue',
  vite: '@vitejs/plugin-vue',
};

export class Vue extends FeatureOption {
  constructor() {
    super({ settingValue: 'vue', promptLabel: 'Vue', promptHint: 'Progressive framework with SFC' });
  }

  override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('vue')
      .addPackage(BUILD_PLUGINS[answers.buildSystem]!);
  }
}
