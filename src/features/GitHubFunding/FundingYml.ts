import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class FundingYml extends FeatureOption {
  public constructor() {
    super({ promptHint: 'GitHub Sponsors funding configuration', promptLabel: 'FUNDING.yml', settingValue: 'funding-yml' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles(['.github/FUNDING.yml']);
  }
}
