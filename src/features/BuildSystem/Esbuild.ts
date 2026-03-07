import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Esbuild extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Fast and simple (recommended)', promptLabel: 'esbuild', settingValue: 'esbuild' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addPackage('esbuild', '0.25.5');
  }
}
