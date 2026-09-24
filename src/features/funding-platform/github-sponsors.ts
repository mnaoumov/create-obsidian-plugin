import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

export class GitHubSponsors extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: 'ea4aaa',
      badgeLabel: 'GitHub Sponsors',
      badgeLogo: 'githubsponsors',
      badgeLogoColor: 'white',
      fundingYmlKey: 'github',
      promptHint: 'github.com/sponsors/<username>',
      promptLabel: 'GitHub Sponsors',
      settingValue: 'github-sponsors'
    });
  }

  public override getUrl(answers: Answers): string {
    return `https://github.com/sponsors/${answers.fundingUsername}`;
  }
}
