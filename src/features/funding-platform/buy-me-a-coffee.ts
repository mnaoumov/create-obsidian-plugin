import type { Answers } from '../../answers/answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

/** Buy Me a Coffee's own default button is drawn at the size its button generator emits. */
const BUTTON_HEIGHT = 60;
const BUTTON_WIDTH = 217;

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
      settingValue: 'buy-me-a-coffee',
      supportButton: {
        alt: 'Buy Me A Coffee',
        height: BUTTON_HEIGHT,
        imageUrl: 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png',
        width: BUTTON_WIDTH
      }
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://www.buymeacoffee.com/${answers.fundingUsername}`;
  }
}
