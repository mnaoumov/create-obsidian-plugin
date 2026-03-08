import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { DesktopAndMobile } from './DesktopAndMobile.ts';
import { DesktopOnly } from './DesktopOnly.ts';

export const PLATFORM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new DesktopAndMobile(), new DesktopOnly()];

export async function promptPlatformSupport(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new DesktopOnly(), message: 'Platform support', options: PLATFORM_SUPPORT_OPTIONS, savedValue });
}
