import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class Liberapay extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: 'f6c915',
      badgeLabel: 'Liberapay',
      badgeLogo: 'liberapay',
      badgeLogoColor: 'black',
      fundingYmlKey: 'liberapay',
      promptHint: 'liberapay.com/<username>',
      promptLabel: 'Liberapay',
      settingValue: 'liberapay'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://liberapay.com/${answers.fundingUsername}`;
  }
}
