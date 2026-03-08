import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-svelte',
  parcel: '@parcel/transformer-svelte',
  rollup: 'rollup-plugin-svelte',
  vite: '@sveltejs/vite-plugin-svelte',
  webpack: 'svelte-loader'
};

export class Svelte extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Lightweight reactive components', promptLabel: 'Svelte', settingValue: 'svelte' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('svelte')
      .addPackage('svelte-check')
      .addPackage('svelte-preprocess')
      .addPackage(getBuildPlugin(answers.bundler))
      .addFiles([
        'src/SvelteComponents/SampleSvelteComponent.d.ts',
        'src/SvelteComponents/SampleSvelteComponent.svelte',
        'src/Views/SampleSvelteView.ts'
      ]);
  }
}

function getBuildPlugin(bundler: string): string {
  const plugin = BUILD_PLUGINS[bundler];
  if (!plugin) {
    throw new Error(`Unsupported bundler for Svelte: ${bundler}`);
  }
  return plugin;
}
