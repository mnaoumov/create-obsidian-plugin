import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The package each bundler needs to compile Svelte, or `null` where the project ships its own.
 *
 * **Parcel has no entry, and cannot have one.** Parcel publishes a scoped transformer for Vue but never
 * has for Svelte, and the community `parcel-transformer-svelte` is a Svelte 3-era package: it peers on
 * `svelte@^3` and reaches for `svelte/compiler.js`, a path Svelte 5 does not ship, so registering it
 * only moved the failure from "No transformers found" to "Could not resolve module svelte/compiler.js".
 * A registry search finds no maintained alternative. The project therefore carries its own
 * `parcel-transformer-svelte.cjs`, the same way it already carries `parcel-resolver-obsidian.cjs` --
 * the whole job is `compile()` plus returning the component's styles as a second asset.
 */
const BUILD_PLUGINS: Record<string, null | string> = {
  esbuild: 'esbuild-svelte',
  parcel: null,
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
      .addSentenceCaseBrand('Svelte')
      .addFiles([
        'src/svelte-components/sample-svelte-component.d.ts',
        'src/svelte-components/sample-svelte-component.svelte',
        'src/views/sample-svelte-view.ts'
      ]);

    const plugin = getBuildPlugin(answers.bundler);
    if (plugin !== null) {
      builder.addPackage(plugin);
    }

    if (answers.bundler === 'parcel') {
      builder.addFiles(['parcel-transformer-svelte.cjs']);
    }
  }
}

/**
 * The plugin package for a bundler, or `null` where the project ships its own.
 *
 * A bundler missing from the table still throws -- that guard is what catches a sixth bundler added
 * without deciding how it compiles Svelte -- but "ships its own" has to be an entry rather than a gap,
 * or the two are indistinguishable. Same shape as the WASM table, and for the same reason.
 */
function getBuildPlugin(bundler: string): null | string {
  if (!Object.hasOwn(BUILD_PLUGINS, bundler)) {
    throw new Error(`Unsupported bundler for Svelte: ${bundler}`);
  }
  return BUILD_PLUGINS[bundler] ?? null;
}
