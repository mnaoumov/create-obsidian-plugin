import type { Answers } from '../../Answers.ts';
import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

const WASM_PLUGINS: Record<string, string> = {
  esbuild: 'esbuild-plugin-wasm',
  rollup: '@rollup/plugin-wasm',
  vite: 'vite-plugin-wasm',
};

export class Wasm extends FeatureOption {
  constructor() {
    super({ settingValue: 'wasm', promptLabel: 'WASM', promptHint: 'Import and use .wasm modules' });
  }

  override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addPackage(WASM_PLUGINS[answers.buildSystem]!);
  }
}
