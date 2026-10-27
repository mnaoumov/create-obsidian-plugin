import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Esbuild extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast and simple (recommended)', promptLabel: 'esbuild', settingValue: 'esbuild' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // On the framework presets the build and dev scripts call obsidian-dev-toolkit's esbuild builder, which depends on
    // Esbuild itself, so nothing in the project imports it. Only standalone's inline build script does.
    if (isFrameworkPreset(answers.preset)) {
      return;
    }

    builder.addPackage('esbuild');
  }
}
