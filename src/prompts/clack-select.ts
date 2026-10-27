import type { SelectOptions } from '@clack/core';
import type { Key } from 'node:readline';

import {
  SelectPrompt,
  settings
} from '@clack/core';
import {
  S_BAR,
  S_BAR_END,
  S_RADIO_ACTIVE,
  S_RADIO_INACTIVE,
  symbol
} from '@clack/prompts';
import { styleText } from 'node:util';

import {
  resetCancelFlag,
  setEscapeCancel,
  throwGoBackOnCancel
} from './clack-utils.ts';

interface SelectOption {
  hint?: string;
  label: string;
  value: string;
}

interface SelectWithGoBackOptions {
  initialValue?: string;
  message: string;
  options: SelectOption[];
}

export async function select(opts: SelectWithGoBackOptions): Promise<string> {
  const selectOpts: SelectOptions<SelectOption> = {
    options: opts.options,
    render() {
      const withGuide = settings.withGuide;
      const header = `${withGuide ? `${styleText('gray', S_BAR)}\n` : ''}${symbol(this.state)}  ${opts.message}\n`;
      const selected = this.options[this.cursor];

      switch (this.state) {
        case 'cancel': {
          const bar = withGuide ? `${styleText('gray', S_BAR)}  ` : '';
          const label = selected?.label ?? '';
          return `${header}${bar}${styleText(['strikethrough', 'dim'], label)}${withGuide ? `\n${styleText('gray', S_BAR)}` : ''}`;
        }
        case 'submit': {
          const bar = withGuide ? `${styleText('gray', S_BAR)}  ` : '';
          const label = selected?.label ?? '';
          return `${header}${bar}${styleText('dim', label)}`;
        }
        default: {
          const bar = withGuide ? `${styleText('cyan', S_BAR)}  ` : '';
          const barEnd = withGuide ? styleText('cyan', S_BAR_END) : '';
          const lines = this.options.map((opt, i) => {
            const o = opt;
            const isActive = i === this.cursor;
            const radio = isActive ? styleText('green', S_RADIO_ACTIVE) : styleText('dim', S_RADIO_INACTIVE);
            const label = isActive ? o.label : styleText('dim', o.label);
            const hint = o.hint && isActive ? ` ${styleText('dim', `(${o.hint})`)}` : '';
            return `${radio} ${label}${hint}`;
          });
          return `${header}${lines.map((line) => `${bar}${line}`).join('\n')}\n${barEnd}\n`;
        }
      }
    }
  };

  if (opts.initialValue !== undefined) {
    selectOpts.initialValue = opts.initialValue;
  }

  const prompt = new SelectPrompt(selectOpts);

  prompt.on('key', (_char: string | undefined, key: Key) => {
    if (key.name === 'escape') {
      setEscapeCancel();
    }
  });

  resetCancelFlag();
  const result = await prompt.prompt();
  return throwGoBackOnCancel(result) ?? '';
}
