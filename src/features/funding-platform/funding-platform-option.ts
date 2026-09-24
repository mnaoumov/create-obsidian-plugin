import type { Answers } from '../../answers.ts';

import { FeatureOption } from '../../feature-option.ts';

/** How one funding platform is written into `FUNDING.yml` and drawn as a README badge. */
export interface FundingPlatformConfig {
  /** The badge's background color, as shields.io takes it: a hex code without the `#`. */
  badgeColor: string;
  /** The badge's text, which is also its alt text. */
  badgeLabel: string;
  /** The simple-icons slug shields.io draws beside the label, where the icon set has one. */
  badgeLogo?: string;
  /** The shields.io `logoColor`, which only means something beside {@link badgeLogo}. */
  badgeLogoColor?: string;
  /** The key GitHub reads this platform from in `.github/FUNDING.yml`. */
  fundingYmlKey: string;
  promptHint: string;
  promptLabel: string;
  settingValue: string;
}

/**
 * One platform GitHub's `FUNDING.yml` understands, and everything the generator derives from it.
 *
 * The platform plus the author's handle on it is the whole funding answer: the URL in `manifest.json`,
 * the README's `## Support` link and badge, and the one line of `FUNDING.yml` are all derived from those
 * two, so they cannot disagree. Only `custom` takes a URL as free text, because it has no handle.
 */
export abstract class FundingPlatformOption extends FeatureOption {
  public readonly badgeColor: string;
  public readonly badgeLabel: string;
  public readonly badgeLogo: string | undefined;
  public readonly badgeLogoColor: string | undefined;
  public readonly fundingYmlKey: string;

  public constructor(config: FundingPlatformConfig) {
    super({ promptHint: config.promptHint, promptLabel: config.promptLabel, settingValue: config.settingValue });
    this.badgeColor = config.badgeColor;
    this.badgeLabel = config.badgeLabel;
    this.badgeLogo = config.badgeLogo;
    this.badgeLogoColor = config.badgeLogoColor;
    this.fundingYmlKey = config.fundingYmlKey;
  }

  /** The shields.io badge, as one markdown image link to {@link getUrl}. */
  public getBadge(answers: Answers): string {
    // Shields.io reads `-` as its field separator and `_` as a space, so both are doubled to stay literal.
    const label = encodeURIComponent(this.badgeLabel.replaceAll('-', '--').replaceAll('_', '__'));
    let query = '';
    if (this.badgeLogo !== undefined) {
      query = `?logo=${this.badgeLogo}`;
      if (this.badgeLogoColor !== undefined) {
        query += `&logoColor=${this.badgeLogoColor}`;
      }
    }
    return `[![${this.badgeLabel}](https://img.shields.io/badge/${label}-${this.badgeColor}${query})](${this.getUrl(answers)})`;
  }

  /** The value written after `<fundingYmlKey>: ` in `FUNDING.yml`. */
  public getFundingYmlValue(answers: Answers): string {
    return answers.fundingUsername;
  }

  /** The page a supporter is sent to, or `''` when there is none to send them to. */
  public abstract getUrl(answers: Answers): string;
}
