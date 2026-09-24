import type { Answers } from '../../answers.ts';

import { FundingPlatformOption } from './funding-platform-option.ts';

/**
 * Any page GitHub has no key for, given as a URL rather than a handle.
 *
 * GitHub's four project-slug platforms (`tidelift`, `community_bridge`, `issuehunt`,
 * `lfx_crowdfunding`) are reached this way too: their value names a project, not the author, so they do
 * not fit the one-handle shape the other options share.
 */
export class Custom extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: 'ff69b4',
      badgeLabel: 'Support',
      fundingYmlKey: 'custom',
      promptHint: 'Any other URL',
      promptLabel: 'Custom URL',
      settingValue: 'custom'
    });
  }

  /** A one-element flow sequence, single-quoted so a URL's `#` or `: ` cannot end the scalar early. */
  public override getFundingYmlValue(answers: Answers): string {
    return `['${answers.fundingUrl.replaceAll('\'', '\'\'')}']`;
  }

  public override getUrl(answers: Answers): string {
    return answers.fundingUrl;
  }
}
