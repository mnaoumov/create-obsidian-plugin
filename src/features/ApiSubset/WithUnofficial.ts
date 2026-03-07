import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class WithUnofficial extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Includes internal undocumented APIs (for experienced devs)', promptLabel: 'Official + Unofficial', settingValue: 'with-unofficial' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addPackage('obsidian-typings', 'obsidian-public-latest');
  }
}
