import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class ObsidianCli extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Reloads via obsidian plugin:reload CLI command', promptLabel: 'Obsidian CLI', settingValue: 'obsidian-cli' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // The obsidian-dev-toolkit adapters run the CLI themselves, and enable the plugin on its first build.
    if (isFrameworkPreset(answers.preset)) {
      builder.addBuildOption('reload', '\'obsidian-cli\'');
    }
  }
}
