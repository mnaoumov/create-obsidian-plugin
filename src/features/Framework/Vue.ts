import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-plugin-vue3',
  rollup: 'rollup-plugin-vue',
  vite: '@vitejs/plugin-vue'
};

export class Vue extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Progressive framework with SFC', promptLabel: 'Vue', settingValue: 'vue' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('vue')
      .addPackage(getBuildPlugin(answers.buildSystem));
  }
}

function getBuildPlugin(buildSystem: string): string {
  const plugin = BUILD_PLUGINS[buildSystem];
  if (!plugin) {
    throw new Error(`Unsupported build system for Vue: ${buildSystem}`);
  }
  return plugin;
}
