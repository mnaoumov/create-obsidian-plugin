import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The package each bundler needs to import `.wasm`, or `null` where the bundler needs none.
 *
 * Parcel 2 resolves `.wasm` imports natively, and webpack 5 does it through
 * `experiments.asyncWebAssembly` -- which `scripts/webpack.config.ts@experiments_wasm.ejs` already
 * contributes. Neither takes a plugin, and neither was in this table, so `wasm` with either of them
 * threw `Unsupported bundler for WASM` and took the whole generation down rather than emitting
 * anything: two of the five bundlers, 752,467,968 of the answer combinations.
 *
 * A bundler missing from the table still throws. That guard is worth keeping -- it is what catches a
 * sixth bundler added without deciding how it reaches WebAssembly -- but "needs no package" has to be
 * an entry rather than a gap, or the two are indistinguishable.
 */
const WASM_PLUGINS: Record<string, null | string> = {
  esbuild: 'esbuild-plugin-wasm',
  parcel: null,
  rollup: '@rollup/plugin-wasm',
  vite: 'vite-plugin-wasm',
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

    builder.addFiles([
      'src/wasm.d.ts',
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
