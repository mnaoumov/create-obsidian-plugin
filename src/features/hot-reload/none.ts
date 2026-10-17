import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class None extends FeatureOption {
  public constructor() {
    super({ promptHint: 'No hot reload support', promptLabel: '(none)', settingValue: 'none' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // The obsidian-dev-toolkit adapters reload through the Hot Reload plugin unless told not to.
    if (isFrameworkPreset(answers.preset)) {
      builder.addBuildOption('reload', 'false');
    }
  }
}
