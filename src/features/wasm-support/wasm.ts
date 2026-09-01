import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The package each bundler needs to import `.wasm`, or `null` where the bundler needs none.
 *
 * Four of the five need none, and each `null` is a decision rather than a gap:
 *
 * - **esbuild** uses its own `binary` loader. `esbuild-plugin-wasm` was installed here and CANNOT work:
 *   it follows the WebAssembly ESM-integration proposal, which means a top-level `await`, which esbuild
 *   supports only for `esm` output -- and an Obsidian bundle is `cjs`.
 * - **vite** imports the module as an asset (`?url`) instead of through `vite-plugin-wasm`, which was
 *   installed here and has the same problem: its own README says it needs `vite-plugin-top-level-await`
 *   unless the target is `esnext`, and `formats: ['cjs']` rules that out.
 * - **webpack** uses an `asset/inline` rule rather than `experiments.asyncWebAssembly`, which emits the
 *   module as a separate chunk that an Obsidian release does not ship.
 * - **parcel** uses its built-in `data-url:` scheme, for the same reason.
 * - **rollup** keeps `@rollup/plugin-wasm`, which is the one of the five that both inlines the module
 *   and hands it over through a plain function call rather than a top-level await.
 *
 * A bundler missing from the table still throws. That guard is worth keeping -- it is what catches a
 * sixth bundler added without deciding how it reaches WebAssembly -- but "needs no package" has to be
 * an entry rather than a gap, or the two are indistinguishable.
 */
const WASM_PLUGINS: Record<string, null | string> = {
  esbuild: null,
  parcel: null,
  rollup: '@rollup/plugin-wasm',
  vite: null,
  webpack: null
};

export class Wasm extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Import and use .wasm modules', promptLabel: 'WASM', settingValue: 'wasm' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    const plugin = getWasmPlugin(answers.bundler);
    if (plugin !== null) {
      builder.addPackage(plugin);
    }

    // The sample command is named `Sample WASM answer`, and `obsidianmd/ui/sentence-case` asks for
    // `Sample wasm answer` unless the acronym is declared a proper noun. Registered here rather than
    // Unconditionally, because the word only appears in a project that answered `wasm`.
    builder.addSentenceCaseBrand('WASM');

    builder.addFiles([
      // The one binary in the template tree, copied verbatim (see `ASSET_EXTENSIONS`). 39 bytes, one
      // Export, `answer()`, returning 42 -- the sample module from CodeScript Toolkit's demo vault.
      'src/wasm/module.wasm',
      // Its source in WebAssembly text format. Documentation only: nothing in the build reads it, and it
      // Is here so the binary beside it is not opaque.
      'src/wasm/module.wat',
      'src/wasm.d.ts',
      'src/wasm/answer.ts',
      'src/wasm/sample-command.ts',
      'src/wasm/README.md'
    ]);
  }
}

function getWasmPlugin(bundler: string): null | string {
  if (!Object.hasOwn(WASM_PLUGINS, bundler)) {
    throw new Error(`Unsupported bundler for WASM: ${bundler}`);
  }
  return WASM_PLUGINS[bundler] ?? null;
}
