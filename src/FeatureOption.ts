import { select } from '@clack/prompts';

import type { Answers } from './Answers.ts';
import type { TemplateBuilder } from './TemplateBuilder.ts';

import { assertNotCancelled } from './clack-utils.ts';

export interface FeatureOptionConfig {
  /** Short description shown next to the label in the prompt */
  promptHint: string;
  /** Display name shown in the prompt */
  promptLabel: string;
  /** Serialized value stored in config and used for dispatch */
  settingValue: string;
}

export abstract class FeatureOption {
  public readonly promptHint: string;
  public readonly promptLabel: string;
  public readonly settingValue: string;

  public constructor(config: FeatureOptionConfig) {
    this.settingValue = config.settingValue;
    this.promptLabel = config.promptLabel;
    this.promptHint = config.promptHint;
  }

  public configure(_builder: TemplateBuilder, _answers: Answers): void {
    // Default: no-op. Override in subclasses.
  }
}

export async function promptFeature(options: readonly FeatureOption[], message: string, defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? options[0]?.settingValue ?? '',
    message,
    options: options.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  assertNotCancelled(result);
  return result;
}

export function resolveFeature(options: readonly FeatureOption[], value: string): FeatureOption {
  const option = options.find((o) => o.settingValue === value);
  if (!option) {
    throw new Error(`Unknown feature value: ${value}`);
  }
  return option;
}
