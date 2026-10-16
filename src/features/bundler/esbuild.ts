import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Esbuild extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast and simple (recommended)', promptLabel: 'esbuild', settingValue: 'esbuild' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addPackage('esbuild');
    // The standalone preset writes its own esbuild invocation and registers framework plugins inline.
    // The toolkit presets call obsidian-dev-toolkit's `build()` / `dev()`, which take the extra plugins as an
    // Argument -- so those two need somewhere to state them, and this is it.
    if (isFrameworkPreset(answers.preset)) {
      builder.addFiles(['scripts/esbuild-plugins.ts']);
    }
  }
}
