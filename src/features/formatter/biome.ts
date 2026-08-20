import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Biome extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast formatter (pairs with Biome linter)', promptLabel: 'Biome', settingValue: 'biome' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // The Biome linter already stages `biome check --write`, which formats too. Only add the format
    // Command when some other linter was chosen, or the same files get formatted twice per commit.
    if (answers.linter !== 'biome') {
      builder.addLintStagedCommand('*.{ts,tsx,mts}', 'biome format --write --no-errors-on-unmatched');
    }

    builder
      .addPackage('@biomejs/biome')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        'biome.json',
        'scripts/format.ts',
        'scripts/format-check.ts'
      ]);
  }
}
