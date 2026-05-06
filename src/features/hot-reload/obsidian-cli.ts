import { FeatureOption } from '../../feature-option.ts';

export class ObsidianCli extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Reloads via obsidian plugin:reload CLI command', promptLabel: 'Obsidian CLI', settingValue: 'obsidian-cli' });
  }
}
