import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class CiWorkflow extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CI workflow only (lint, test, build)', promptLabel: 'CI', settingValue: 'ci' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles(['.github/workflows/ci.yml']);
  }
}
