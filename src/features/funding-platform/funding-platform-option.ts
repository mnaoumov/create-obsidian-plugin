import type { Answers } from '../../answers/answers.ts';

import { FeatureOption } from '../../feature-option.ts';

/** How one funding platform is written into `FUNDING.yml` and drawn as a README badge. */
export interface FundingPlatformConfig {
  /** The badge's background color, as shields.io takes it: a hex code without the `#`. */
  readonly badgeColor: string;
  /** The badge's text, which is also its alt text. */
  readonly badgeLabel: string;
  /** The simple-icons slug shields.io draws beside the label, where the icon set has one. */
  readonly badgeLogo?: string;
  /** The shields.io `logoColor`, which only means something beside {@link badgeLogo}. */
  readonly badgeLogoColor?: string;
  /** The key GitHub reads this platform from in `.github/FUNDING.yml`. */
  readonly fundingYmlKey: string;
  readonly promptHint: string;
  readonly promptLabel: string;
  readonly settingValue: string;
  /** The platform's own published button, drawn as the README's `## Support` link where the platform has one. */
  readonly supportButton?: FundingSupportButton;
}

/** A button image a funding platform publishes for linking to it, and the size it is meant to be drawn at. */
export interface FundingSupportButton {
  readonly alt: string;
  readonly height: number;
  readonly imageUrl: string;
  readonly width: number;
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '\'': '&#39;',
  '"': '&quot;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

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
  public readonly supportButton: FundingSupportButton | undefined;

  public constructor(config: FundingPlatformConfig) {
    super({ promptHint: config.promptHint, promptLabel: config.promptLabel, settingValue: config.settingValue });
    this.badgeColor = config.badgeColor;
    this.badgeLabel = config.badgeLabel;
    this.badgeLogo = config.badgeLogo;
    this.badgeLogoColor = config.badgeLogoColor;
    this.fundingYmlKey = config.fundingYmlKey;
    this.supportButton = config.supportButton;
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

  /**
   * The README's `## Support` call to action, as one HTML link to {@link getUrl}.
   *
   * It is the platform's own button where the platform publishes one, so the section reads as an invitation rather
   * than as a line of body text, and a text link only where there is no button to draw.
   */
  public getSupportLink(answers: Answers): string {
    const href = escapeHtml(this.getUrl(answers));
    if (this.supportButton === undefined) {
      return `<a href="${href}" target="_blank">Support this plugin</a>`;
    }
    const { alt, height, imageUrl, width } = this.supportButton;
    return `<a href="${href}" target="_blank"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" height="${String(height)}" width="${String(width)}"></a>`;
  }

  /** The page a supporter is sent to, or `''` when there is none to send them to. */
  public abstract getUrl(answers: Answers): string;
}

function escapeHtml(value: string): string {
  return value.replaceAll(/["&'<>]/g, (character) => HTML_ESCAPES[character] ?? character);
}
