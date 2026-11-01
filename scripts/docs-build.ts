import { wrapCliTask } from '@mnaoumov/typescript-dev-toolkit/cli-utils';

import { buildDocsSite } from './docs-site.ts';

await wrapCliTask(async () => {
  await buildDocsSite();
});
