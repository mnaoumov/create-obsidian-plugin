import { select } from '@clack/prompts';

import { assertNotCancelled } from '../clack-utils.ts';

export async function promptPlatformSupport(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'desktop-only',
    message: 'Platform support',
    options: [
      { hint: 'Plugin works only on desktop', label: 'Desktop only', value: 'desktop-only' },
      { hint: 'Plugin works on desktop and mobile', label: 'Desktop and mobile', value: 'desktop-and-mobile' }
    ]
  });
  assertNotCancelled(result);
  return result;
}
