import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

const WASM_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-plugin-wasm',
  rollup: '@rollup/plugin-wasm',
  vite: 'vite-plugin-wasm'
};

export class Wasm extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Import and use .wasm modules', promptLabel: 'WASM', settingValue: 'wasm' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage(getWasmPlugin(answers.bundler))
      .addFiles([
        'src/wasm.d.ts',
        'src/wasm/README.md'
      ]);
  }
}

function getWasmPlugin(bundler: string): string {
  const plugin = WASM_PLUGINS[bundler];
  if (!plugin) {
    throw new Error(`Unsupported bundler for WASM: ${bundler}`);
  }
  return plugin;
}
