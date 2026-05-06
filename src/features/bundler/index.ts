import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Esbuild } from './esbuild.ts';
import { Parcel } from './parcel.ts';
import { Rollup } from './rollup.ts';
import { Vite } from './vite.ts';
import { Webpack } from './webpack.ts';

export const BUNDLER_OPTIONS: readonly FeatureOption[] = [new Esbuild(), new Parcel(), new Rollup(), new Vite(), new Webpack()];

export async function promptBundler(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Esbuild(), message: 'Bundler', options: BUNDLER_OPTIONS, savedValue });
}
