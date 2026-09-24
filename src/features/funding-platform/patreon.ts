import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class Patreon extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: 'f96854',
      badgeLabel: 'Patreon',
      badgeLogo: 'patreon',
      badgeLogoColor: 'white',
      fundingYmlKey: 'patreon',
      promptHint: 'patreon.com/<username>',
      promptLabel: 'Patreon',
      settingValue: 'patreon'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://www.patreon.com/${answers.fundingUsername}`;
  }
}
