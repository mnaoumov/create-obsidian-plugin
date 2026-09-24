import { FundingPlatformOption } from './funding-platform-option.ts';

export class None extends FundingPlatformOption {
  public constructor() {
    super({
      badgeColor: '',
      badgeLabel: '',
      fundingYmlKey: '',
      promptHint: 'No funding link, FUNDING.yml or badge',
      promptLabel: '(none)',
      settingValue: 'none'
    });
  }

  public override getUrl(): string {
    return '';
  }
}
