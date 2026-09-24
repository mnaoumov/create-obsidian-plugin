import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class BuyMeACoffee extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: 'ffdd00',
      badgeLabel: 'Buy Me a Coffee',
      badgeLogo: 'buy-me-a-coffee',
      badgeLogoColor: 'black',
      fundingYmlKey: 'buy_me_a_coffee',
      promptHint: 'buymeacoffee.com/<username>',
      promptLabel: 'Buy Me a Coffee',
      settingValue: 'buy-me-a-coffee'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://www.buymeacoffee.com/${answers.fundingUsername}`;
  }
}
