import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Esbuild extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast and simple (recommended)', promptLabel: 'esbuild', settingValue: 'esbuild' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addPackage('esbuild');
  }
}
