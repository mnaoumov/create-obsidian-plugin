import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Biome } from './biome.ts';
import { Dprint } from './dprint.ts';
import { None } from './none.ts';
import { Prettier } from './prettier.ts';

export const FORMATTER_OPTIONS: readonly FeatureOption[] = [new None(), new Biome(), new Dprint(), new Prettier()];

/**
 * The formatters a fresh project fails `format:check` under until `format` has run once.
 *
 * The templates are authored in dprint's style, which prettier and biome cannot be configured to
 * reproduce. Both `src/main.ts` (the `Next steps` it prints) and the gate tier read this, so the gate runs
 * exactly the steps a user is told to run.
 */
const FORMATTERS_NEEDING_INITIAL_FORMAT: ReadonlySet<string> = new Set(['biome', 'prettier']);

export function needsInitialFormat(formatter: string): boolean {
  return FORMATTERS_NEEDING_INITIAL_FORMAT.has(formatter);
}

export async function promptFormatter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Dprint(), message: 'Formatter', options: FORMATTER_OPTIONS, savedValue });
}
