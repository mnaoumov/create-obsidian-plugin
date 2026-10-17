import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Vite extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Modern dev server with HMR', promptLabel: 'Vite', settingValue: 'vite' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('vite')
      .addFiles([
        'vite.config.ts',
        'scripts/vite.config.ts'
      ]);

    // On the framework presets obsidian-dev-toolkit's vite plugin builds the plugin, and the scripts only run the vite
    // Command line. Standalone shares one build script with the other command-line bundlers.
    builder.addPartial(isFrameworkPreset(answers.preset) ? 'adapter-cli' : 'cli-bundler');
  }
}
