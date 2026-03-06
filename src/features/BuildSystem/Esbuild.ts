import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Esbuild extends FeatureOption {
  constructor() {
    super({ settingValue: 'esbuild', promptLabel: 'esbuild', promptHint: 'Fast and simple (recommended)' });
  }

  override configure(builder: TemplateBuilder): void {
    builder.addPackage('esbuild', '0.25.5');
  }
}
