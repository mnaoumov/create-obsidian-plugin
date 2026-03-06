import type { Answers } from '../../Answers.ts';
import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-svelte',
  rollup: 'rollup-plugin-svelte',
  vite: '@sveltejs/vite-plugin-svelte',
};

export class Svelte extends FeatureOption {
  constructor() {
    super({ settingValue: 'svelte', promptLabel: 'Svelte', promptHint: 'Lightweight reactive components' });
  }

  override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('svelte')
      .addPackage('svelte-check')
      .addPackage('svelte-preprocess')
      .addPackage(BUILD_PLUGINS[answers.buildSystem]!)
      .addFiles([
        'src/SvelteComponents/SampleSvelteComponent.d.ts',
        'src/SvelteComponents/SampleSvelteComponent.svelte',
        'src/Views/SampleSvelteView.ts',
      ]);
  }
}
