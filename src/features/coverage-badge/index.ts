import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { CoverageBadge } from './coverage-badge.ts';
import { None } from './none.ts';

export const COVERAGE_BADGE_OPTIONS: readonly FeatureOption[] = [new None(), new CoverageBadge()];

export async function promptCoverageBadge(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'Coverage badge', options: COVERAGE_BADGE_OPTIONS, savedValue });
}
