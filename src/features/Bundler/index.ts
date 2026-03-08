import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Esbuild } from './Esbuild.ts';
import { Parcel } from './Parcel.ts';
import { Rollup } from './Rollup.ts';
import { Vite } from './Vite.ts';
import { Webpack } from './Webpack.ts';

export const BUNDLER_OPTIONS: readonly FeatureOption[] = [new Esbuild(), new Parcel(), new Rollup(), new Vite(), new Webpack()];

export async function promptBundler(defaultValue?: string): Promise<string> {
  return promptFeature(BUNDLER_OPTIONS, 'Bundler', defaultValue);
}
