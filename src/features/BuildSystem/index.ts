import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Esbuild } from './Esbuild.ts';
import { Rollup } from './Rollup.ts';
import { Vite } from './Vite.ts';
import { Webpack } from './Webpack.ts';

export const BUILD_SYSTEM_OPTIONS: readonly FeatureOption[] = [new Esbuild(), new Rollup(), new Vite(), new Webpack()];

export async function promptBuildSystem(defaultValue?: string): Promise<string> {
  return promptFeature(BUILD_SYSTEM_OPTIONS, 'Build system', defaultValue);
}
