import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { DesktopAndMobile } from './desktop-and-mobile.ts';
import { DesktopOnly } from './desktop-only.ts';

export const PLATFORM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new DesktopAndMobile(), new DesktopOnly()];

export async function promptPlatformSupport(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new DesktopOnly(), message: 'Platform support', options: PLATFORM_SUPPORT_OPTIONS, savedValue });
}
