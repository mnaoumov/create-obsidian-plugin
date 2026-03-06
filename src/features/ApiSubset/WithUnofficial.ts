import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class WithUnofficial extends FeatureOption {
  constructor() {
    super({ settingValue: 'with-unofficial', promptLabel: 'Official + Unofficial', promptHint: 'Includes internal undocumented APIs (for experienced devs)' });
  }

  override configure(builder: TemplateBuilder): void {
    builder.addPackage('obsidian-typings', 'obsidian-public-latest');
  }
}
