import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Biome extends FeatureOption {
  public constructor() {
    super({ partialName: 'biome-linter', promptHint: 'Fast linter and formatter', promptLabel: 'Biome', settingValue: 'biome' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addLintStagedCommand('*.{ts,tsx,mts}', 'biome check --write --no-errors-on-unmatched')
      .addPackage('@biomejs/biome')
      .addDepcheckIgnore('@biomejs/biome', 'run as the `biome` CLI by the format and lint scripts, configured by `biome.jsonc`.')
      .addScript('lint')
      .addScript('lint:fix')
      .addFiles([
        'biome.jsonc',
        'scripts/lint.ts',
        'scripts/lint-fix.ts'
      ]);
  }
}
