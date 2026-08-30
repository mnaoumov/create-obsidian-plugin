import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Parcel extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Zero-config bundler', promptLabel: 'Parcel', settingValue: 'parcel' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('parcel')
      .addPackage('@parcel/config-default')
      // Only Parcel needs a plugin package: its resolver is the only way to mark the modules Obsidian
      // Supplies at runtime as external. Every other bundler takes a plain `external` list in its config.
      .addPackage('@parcel/plugin')
      .addFiles([
        '.parcelrc',
        'parcel-resolver-obsidian.cjs'
      ]);

    // Marks this as a bundler driven from the command line, so it shares one build script with the
    // Other three instead of each carrying a near-identical copy. esbuild is the exception: it is
    // Driven through its API, and obsidian-dev-utils supplies a build for it.
    builder.addPartial('cli-bundler');
  }
}
