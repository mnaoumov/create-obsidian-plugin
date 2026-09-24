import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class ThanksDev extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: '000000',
      badgeLabel: 'thanks.dev',
      fundingYmlKey: 'thanks_dev',
      promptHint: 'thanks.dev/<username>, e.g. u/gh/<GitHub username>',
      promptLabel: 'thanks.dev',
      settingValue: 'thanks-dev'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://thanks.dev/${answers.fundingUsername}`;
  }
}
