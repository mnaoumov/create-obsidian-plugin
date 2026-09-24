import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Parcel extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Zero-config bundler', promptLabel: 'Parcel', settingValue: 'parcel' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('parcel')
      .addDepcheckIgnore('parcel', 'run as a CLI by the build script.')
      .addPackage('@parcel/config-default')
      .addDepcheckIgnore('@parcel/config-default', 'extended by name in `.parcelrc`.')
      // Only Parcel needs a plugin package, and it needs it three times: its resolver is the only way to
      // Mark the modules Obsidian supplies at runtime as external, its namer the only way to name the
      // Emitted stylesheet, and a transformer the only way to keep a dynamic `import()` out of a chunk of
      // Its own. Every other bundler takes a plain `external` list, an output-name option and an
      // Inline-dynamic-imports option in its config.
      .addPackage('@parcel/plugin')
      .addFiles([
        '.parcelrc',
        'parcel-namer-obsidian.cjs',
        'parcel-resolver-obsidian.cjs',
        'parcel-transformer-inline-imports.cjs'
      ]);

    // Marks this as a bundler driven from the command line, so it shares one build script with the
    // Other three instead of each carrying a near-identical copy. esbuild is the exception: it is
    // Driven through its API, and obsidian-dev-utils supplies a build for it.
    builder.addPartial('cli-bundler');
  }
}
