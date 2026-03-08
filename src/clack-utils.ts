import {
  cancel,
  isCancel
} from '@clack/prompts';

interface KeyInfo {
  name: string;
}

interface Rl {
  cursor: number;
  line: string;
  write(data: null | string, key?: RlWriteKey): void;
}

interface RlWriteKey {
  ctrl: boolean;
  name: string;
}

interface TextPromptOpts {
  defaultValue?: string;
  placeholder?: string;
}

export function assertNotCancelled<T>(value: symbol | T): asserts value is T {
  if (isCancel(value)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
}

/**
 * Patches TextPrompt so that pressing Tab on an empty input fills in the
 * defaultValue (or placeholder), allowing the user to edit before submitting.
 * Must be called once before any prompts are shown.
 */
export function enableTabCompletion(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-extraneous-dependencies -- @clack/core is a transitive dependency of @clack/prompts; require avoids adding it as direct dep
  const { TextPrompt } = require('@clack/core') as { TextPrompt: { prototype: Record<string, unknown> } };
  const proto = TextPrompt.prototype;
  const originalOnKeypress = proto['onKeypress'] as (char: string, key: KeyInfo) => void;

  // eslint-disable-next-line func-name-matching -- patching private method on prototype
  proto['onKeypress'] = function onKeypressWithTabCompletion(this: Record<string, unknown>, char: string, key: KeyInfo): void {
    if (key.name === 'tab' && !(this['userInput'] as string)) {
      const opts = this['opts'] as TextPromptOpts;
      const fillValue = opts.defaultValue ?? opts.placeholder;
      if (fillValue) {
        const rl = this['rl'] as Rl | undefined;
        rl?.write(null, { ctrl: true, name: 'u' });
        rl?.write(fillValue);
        this['_cursor'] = rl?.cursor ?? 0;
        const setUserInput = proto['_setUserInput'] as (value: string | undefined) => void;
        setUserInput.call(this, rl?.line);
        const render = this['render'] as () => void;
        render.call(this);
        return;
      }
    }
    originalOnKeypress.call(this, char, key);
  };
}
