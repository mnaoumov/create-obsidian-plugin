import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class BugAndFeature extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Bug report and feature request templates', promptLabel: 'Bug & Feature', settingValue: 'bug-and-feature' });
  }

  // The real plugins' names, underscores and all. They used to be emitted as `bug-report.yml` and
  // `feature-request.yml`, because any `_` in a basename was read as the partial marker and the render
  // Loop silently skipped both forms; `isPartialTemplatePath` now reads only a kebab-case tail as one.
  public override configure(builder: TemplateBuilder): void {
    builder.addFiles([
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/config.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml'
    ]);
  }
}
