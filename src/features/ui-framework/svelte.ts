import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The package each bundler needs to compile Svelte.
 *
 * Parcel's is the community `parcel-transformer-svelte`, NOT `@parcel/transformer-svelte`: Parcel
 * publishes an official `@parcel/transformer-vue` but has never published a scoped Svelte one, so the
 * scoped name this used to carry 404s and `svelte` with `parcel` could not `npm install` at all.
 */
const BUILD_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-svelte',
  parcel: 'parcel-transformer-svelte',
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
      .addSentenceCaseBrand('Svelte')
      .addFiles([
        'src/svelte-components/sample-svelte-component.d.ts',
        'src/svelte-components/sample-svelte-component.svelte',
        'src/views/sample-svelte-view.ts'
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
