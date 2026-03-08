import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Parcel extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Zero-config bundler', promptLabel: 'Parcel', settingValue: 'parcel' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('parcel')
      .addPackage('@parcel/config-default')
      .addFiles(['.parcelrc']);
  }
}
