import { cancel, isCancel } from '@clack/prompts';

export function assertNotCancelled<T>(value: symbol | T): asserts value is T {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
}
