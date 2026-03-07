import type { Answers } from '../../Answers.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

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
    builder.addPackage(getWasmPlugin(answers.buildSystem));
  }
}

function getWasmPlugin(buildSystem: string): string {
  const plugin = WASM_PLUGINS[buildSystem];
  if (!plugin) {
    throw new Error(`Unsupported build system for WASM: ${buildSystem}`);
  }
  return plugin;
}
