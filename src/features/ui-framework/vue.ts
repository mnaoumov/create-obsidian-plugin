import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-plugin-vue3',
  parcel: '@parcel/transformer-vue',
  rollup: 'rollup-plugin-vue',
  vite: '@vitejs/plugin-vue',
  webpack: 'vue-loader'
};

export class Vue extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Progressive framework with SFC', promptLabel: 'Vue', settingValue: 'vue' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('vue')
      .addPackage(getBuildPlugin(answers.bundler))
      .addSentenceCaseBrand('Vue')
      .addFiles([
        'src/vue-components/sample-vue-component.d.ts',
        'src/vue-components/sample-vue-component.vue',
        'src/views/sample-vue-view.ts'
      ]);
  }
}

function getBuildPlugin(bundler: string): string {
  const plugin = BUILD_PLUGINS[bundler];
  if (!plugin) {
    throw new Error(`Unsupported bundler for Vue: ${bundler}`);
  }
  return plugin;
}
