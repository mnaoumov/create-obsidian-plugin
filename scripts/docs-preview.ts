import { wrapCliTask } from '@mnaoumov/typescript-dev-toolkit/cli-utils';

import { previewDocsSite } from './docs-site.ts';

await wrapCliTask(async () => {
  await previewDocsSite();
});
