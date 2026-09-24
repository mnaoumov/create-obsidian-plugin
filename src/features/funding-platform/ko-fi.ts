import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class KoFi extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: 'ff5e5b',
      badgeLabel: 'Ko-fi',
      badgeLogo: 'kofi',
      badgeLogoColor: 'white',
      fundingYmlKey: 'ko_fi',
      promptHint: 'ko-fi.com/<username>',
      promptLabel: 'Ko-fi',
      settingValue: 'ko-fi'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://ko-fi.com/${answers.fundingUsername}`;
  }
}
