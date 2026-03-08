import type { TextOptions } from '@clack/core';
import type { Key } from 'node:readline';

import {
  settings,
  TextPrompt
} from '@clack/core';
import {
  S_BAR,
  S_BAR_END,
  symbol
} from '@clack/prompts';
import { styleText } from 'node:util';

interface TextWithCompletionOptions {
  defaultValue?: string | undefined;
  message: string;
  placeholder?: string | undefined;
  validate?: ((value: string | undefined) => Error | string | undefined) | undefined;
}

class TextPromptWithCompletion extends TextPrompt {
  private readonly completionValue: string;

  public constructor(opts: TextOptions) {
    super(opts);
    this.completionValue = opts.defaultValue ?? opts.placeholder ?? '';
  }

  protected override _isActionKey(char: string | undefined, key: Key): boolean {
    if (this.shouldComplete(key)) {
      this._clearUserInput();
      this._setUserInput(this.completionValue, true);
      return false;
    }
    return super._isActionKey(char, key);
  }

  private shouldComplete(key: Key): boolean {
    if (this.userInput || !this.completionValue) {
      return false;
    }
    return key.name === 'tab' || key.name === 'right' || key.name === 'end';
  }
}

export async function text(opts: TextWithCompletionOptions): Promise<string | symbol> {
  const textOpts: TextOptions = {
    render() {
      const withGuide = settings.withGuide;
      const header = `${withGuide ? `${styleText('gray', S_BAR)}\n` : ''}${symbol(this.state)}  ${opts.message}\n`;
      const placeholderDisplay = opts.placeholder
        ? styleText('inverse', opts.placeholder[0] ?? '') + styleText('dim', opts.placeholder.slice(1))
        : styleText(['inverse', 'hidden'], '_');
      const input = this.userInput ? this.userInputWithCursor : placeholderDisplay;
      const val = this.value ?? '';

      switch (this.state) {
        case 'cancel': {
          const strikeVal = val ? `  ${styleText(['strikethrough', 'dim'], val)}` : '';
          const bar = withGuide ? styleText('gray', S_BAR) : '';
          return `${header}${bar}${strikeVal}${val.trim() ? `\n${bar}` : ''}`;
        }
        case 'error': {
          const errorMsg = this.error ? `  ${styleText('yellow', this.error)}` : '';
          const bar = withGuide ? `${styleText('yellow', S_BAR)}  ` : '';
          const barEnd = withGuide ? styleText('yellow', S_BAR_END) : '';
          return `${header.trim()}\n${bar}${input}\n${barEnd}${errorMsg}\n`;
        }
        case 'submit': {
          const dimVal = val ? `  ${styleText('dim', val)}` : '';
          const bar = withGuide ? styleText('gray', S_BAR) : '';
          return `${header}${bar}${dimVal}`;
        }
        default: {
          const bar = withGuide ? `${styleText('cyan', S_BAR)}  ` : '';
          const barEnd = withGuide ? styleText('cyan', S_BAR_END) : '';
          return `${header}${bar}${input}\n${barEnd}\n`;
        }
      }
    },
    validate: opts.validate
  };

  if (opts.defaultValue !== undefined) {
    textOpts.defaultValue = opts.defaultValue;
  }
  if (opts.placeholder !== undefined) {
    textOpts.placeholder = opts.placeholder;
  }

  const result = await new TextPromptWithCompletion(textOpts).prompt();
  return result ?? '';
}
