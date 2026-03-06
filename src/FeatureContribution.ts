import type { Answers } from './Answers.ts';
import type { TemplateBuilder } from './TemplateBuilder.ts';

export interface FeatureOptionConfig {
  /** Short description shown next to the label in the prompt */
  promptHint: string;
  /** Display name shown in the prompt */
  promptLabel: string;
  /** Serialized value stored in config and used for dispatch */
  settingValue: string;
}

export abstract class FeatureOption {
  readonly promptHint: string;
  readonly promptLabel: string;
  readonly settingValue: string;

  constructor(config: FeatureOptionConfig) {
    this.settingValue = config.settingValue;
    this.promptLabel = config.promptLabel;
    this.promptHint = config.promptHint;
  }

  configure(_builder: TemplateBuilder, _answers: Answers): void {
    // Default: no-op. Override in subclasses.
  }
}

export function resolveFeature(options: readonly FeatureOption[], value: string): FeatureOption {
  const option = options.find((o) => o.settingValue === value);
  if (!option) {
    throw new Error(`Unknown feature value: ${value}`);
  }
  return option;
}
