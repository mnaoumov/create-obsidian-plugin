import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class BugAndFeature extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Bug report and feature request templates', promptLabel: 'Bug & Feature', settingValue: 'bug-and-feature' });
  }

  // Kebab-case, and not by style preference: `isPartialFile` treats ANY `_` in a basename as the
  // Partial marker, so `bug_report.yml` and `feature_request.yml` were skipped by the render loop
  // Entirely. Every project that asked for issue templates got only `config.yml`, pointing at forms
  // That were never written. GitHub does not care what the files are called; the composition system
  // Does.
  public override configure(builder: TemplateBuilder): void {
    builder.addFiles([
      '.github/ISSUE_TEMPLATE/bug-report.yml',
      '.github/ISSUE_TEMPLATE/config.yml',
      '.github/ISSUE_TEMPLATE/feature-request.yml'
    ]);
  }
}
