import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Esbuild } from './Esbuild.ts';
import { Parcel } from './Parcel.ts';
import { Rollup } from './Rollup.ts';
import { Vite } from './Vite.ts';
import { Webpack } from './Webpack.ts';

export const BUNDLER_OPTIONS: readonly FeatureOption[] = [new Esbuild(), new Parcel(), new Rollup(), new Vite(), new Webpack()];

export async function promptBundler(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Esbuild(), message: 'Bundler', options: BUNDLER_OPTIONS, savedValue });
}
