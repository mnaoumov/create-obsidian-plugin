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

    // `rollup-plugin-vue` hands a `<script lang="ts">` block on as a virtual module and compiles none of
    // It, and `@rollup/plugin-typescript` only compiles files in the tsconfig program, which a virtual
    // Module never is. So on rollup a babel pass carrying only the TypeScript preset strips the types.
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('@babel/core')
        .addPackage('@babel/preset-typescript')
        .addPackage('@rollup/plugin-babel')
        .addDepcheckIgnore('@babel/preset-typescript', 'named as a string in `scripts/rollup.config.ts`, never imported.')
        .addPartial('rollup-babel');
    }

    if (answers.bundler === 'parcel') {
      builder.addDepcheckIgnore('@parcel/transformer-vue', 'resolved by name by `@parcel/config-default` for `.vue`; nothing imports it.');
    }
  }
}

function getBuildPlugin(bundler: string): string {
  const plugin = BUILD_PLUGINS[bundler];
  if (!plugin) {
    throw new Error(`Unsupported bundler for Vue: ${bundler}`);
  }
  return plugin;
}
