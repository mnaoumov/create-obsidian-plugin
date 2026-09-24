import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class OpenCollective extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: '7fadf2',
      badgeLabel: 'Open Collective',
      badgeLogo: 'opencollective',
      badgeLogoColor: 'white',
      fundingYmlKey: 'open_collective',
      promptHint: 'opencollective.com/<username>',
      promptLabel: 'Open Collective',
      settingValue: 'open-collective'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://opencollective.com/${answers.fundingUsername}`;
  }
}
