import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class BugAndFeature extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Bug report and feature request templates', promptLabel: 'Bug & Feature', settingValue: 'bug-and-feature' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder.addFiles([
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/config.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml'
    ]);
  }
}
