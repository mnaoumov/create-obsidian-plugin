import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { DesktopAndMobile } from './DesktopAndMobile.ts';
import { DesktopOnly } from './DesktopOnly.ts';

export const PLATFORM_SUPPORT_OPTIONS: readonly FeatureOption[] = [new DesktopOnly(), new DesktopAndMobile()];

export async function promptPlatformSupport(defaultValue?: string): Promise<string> {
  return promptFeature(PLATFORM_SUPPORT_OPTIONS, 'Platform support', defaultValue);
}
