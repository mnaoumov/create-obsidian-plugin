import { wrapCliTask } from '@mnaoumov/typescript-dev-toolkit/cli-utils';

import { devDocsSite } from './docs-site.ts';

await wrapCliTask(async () => {
  await devDocsSite();
});
