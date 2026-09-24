import type { Answers } from '../../answers.ts';
import type { FundingPlatformOption } from './funding-platform-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { BuyMeACoffee } from './buy-me-a-coffee.ts';
import { Custom } from './custom.ts';
import { GitHubSponsors } from './github-sponsors.ts';
import { KoFi } from './ko-fi.ts';
import { Liberapay } from './liberapay.ts';
import { None } from './none.ts';
import { OpenCollective } from './open-collective.ts';
import { Patreon } from './patreon.ts';
import { Polar } from './polar.ts';
import { ThanksDev } from './thanks-dev.ts';

export const FUNDING_PLATFORM_OPTIONS: readonly FundingPlatformOption[] = [
  new None(),
  new BuyMeACoffee(),
  new GitHubSponsors(),
  new KoFi(),
  new Liberapay(),
  new OpenCollective(),
  new Patreon(),
  new Polar(),
  new ThanksDev(),
  new Custom()
];

/** The platforms whose answer is a handle, so the prompt that follows asks for `fundingUsername`. */
export function asksFundingUsername(platform: string | undefined): boolean {
  return platform !== undefined && platform !== 'none' && platform !== 'custom';
}

export async function promptFundingPlatform(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new BuyMeACoffee(), message: 'Funding platform', options: FUNDING_PLATFORM_OPTIONS, savedValue });
}

/**
 * The funding platform these answers link to, or `null` when there is nothing to link to.
 *
 * `custom` with an empty URL is `null` too: a platform chosen with no page behind it would emit an empty
 * `fundingUrl`, a badge pointing nowhere and a `FUNDING.yml` line GitHub rejects.
 */
export function resolveFunding(answers: Answers): FundingPlatformOption | null {
  const option = FUNDING_PLATFORM_OPTIONS.find((candidate) => candidate.settingValue === answers.fundingPlatform);
  if (!option?.getUrl(answers)) {
    return null;
  }
  return option;
}

/**
 * A handle is written unquoted into `FUNDING.yml` and appended to a URL, so it may hold nothing that
 * either would read as syntax. `/` stays allowed: a thanks.dev handle is `u/gh/<GitHub username>`.
 */
export function validateFundingUsername(value: string | undefined): string | undefined {
  if (!value) {
    return 'Should not be empty';
  }
  if (!/^[\w./-]+$/.test(value)) {
    return 'Use only letters, digits, `.`, `_`, `-` and `/`';
  }
  return undefined;
}
