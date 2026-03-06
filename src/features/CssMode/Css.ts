import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Css extends FeatureOption {
  constructor() {
    super({ settingValue: 'css', promptLabel: 'CSS', promptHint: 'Plain CSS styles' });
  }

  override configure(builder: TemplateBuilder): void {
    builder.addFiles(['src/styles/main.scss']);
  }
}
