import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isDevUtilsPreset } from '../preset/is-dev-utils-preset.ts';

/**
 * The package each bundler needs to compile Svelte, or `null` where the project ships its own.
 *
 * On the obsidian-dev-utils presets' esbuild build the `esbuild` entry is not declared at all: that library
 * depends on `esbuild-svelte` and registers it itself, so the project's build never names it.
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

const SVELTE_PREPROCESS_BUNDLERS = new Set(['esbuild', 'rollup', 'webpack']);

export class Svelte extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Lightweight reactive components', promptLabel: 'Svelte', settingValue: 'svelte' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('svelte')
      .addSentenceCaseBrand('Svelte')
      .addFiles([
        'src/svelte-components/sample-svelte-component.d.ts',
        'src/svelte-components/sample-svelte-component.svelte',
        'src/views/sample-svelte-view.ts'
      ]);

    // Obsidian-dev-utils' esbuild build compiles Svelte with its own `esbuild-svelte` and `svelte-preprocess`,
    // So there the project reaches neither.
    const isDevUtilsEsbuild = isDevUtilsPreset(answers.preset) && answers.bundler === 'esbuild';
    const plugin = getBuildPlugin(answers.bundler);
    if (plugin !== null && !isDevUtilsEsbuild) {
      builder.addPackage(plugin);
    }

    // `svelte-check` is the exception: obsidian-dev-utils' `build:compile` runs the PROJECT's copy and
    // Refuses to build when package.json does not declare it, although it also depends on its own.
    builder
      .addPackage('svelte-check')
      .addDepcheckIgnore(
        'svelte-check',
        isDevUtilsEsbuild
          ? 'run as a CLI by obsidian-dev-utils\' `build:compile`, which refuses to build without it declared.'
          : 'run as a CLI by `scripts/build.ts`.'
      );

    // Only the esbuild, rollup and webpack configs preprocess; vite's plugin and the parcel transformer
    // The project ships do not import it.
    if (!isDevUtilsEsbuild && SVELTE_PREPROCESS_BUNDLERS.has(answers.bundler)) {
      builder.addPackage('svelte-preprocess');
    }

    if (answers.bundler === 'webpack') {
      builder.addDepcheckIgnore('svelte-loader', 'named as a loader string in `scripts/webpack.config.ts`.');
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
