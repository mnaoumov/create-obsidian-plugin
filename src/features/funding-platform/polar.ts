import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class Polar extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: '0062ff',
      badgeLabel: 'Polar',
      fundingYmlKey: 'polar',
      promptHint: 'polar.sh/<username>',
      promptLabel: 'Polar',
      settingValue: 'polar'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://polar.sh/${answers.fundingUsername}`;
  }
}
