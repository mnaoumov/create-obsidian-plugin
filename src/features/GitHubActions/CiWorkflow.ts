import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class CiWorkflow extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CI workflow only (lint, test, build)', promptLabel: 'CI', settingValue: 'ci' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles(['.github/workflows/ci.yml']);
  }
}
