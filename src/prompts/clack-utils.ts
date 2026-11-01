import type { CANCEL_SYMBOL } from '@clack/prompts';

import {
  cancel,
  isCancel
} from '@clack/prompts';

let lastCancelWasEscape = false;

export class GoBackError extends Error {
  public constructor() {
    super('Go back');
  }
}

export function assertNotCancelled<T>(value: T | typeof CANCEL_SYMBOL): asserts value is T {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
}

export function resetCancelFlag(): void {
  lastCancelWasEscape = false;
}

export function setEscapeCancel(): void {
  lastCancelWasEscape = true;
}

export function throwGoBackOnCancel<T>(value: T | typeof CANCEL_SYMBOL): T {
  if (isCancel(value)) {
    if (lastCancelWasEscape) {
      lastCancelWasEscape = false;
      throw new GoBackError();
    }
    cancel('Operation cancelled.');
    process.exit(0);
  }
  return value;
}
