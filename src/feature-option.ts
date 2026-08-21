import type { Answers } from './answers.ts';
import type { TemplateBuilder } from './template-builder.ts';

import { select } from './clack-select.ts';

export interface FeatureOptionConfig {
  /**
   * Name this option's template partials are keyed on. Defaults to {@link settingValue}, which is right
   * for all but the options whose value is claimed by more than one question -- `biome` answers both
   * `linter` and `formatter`, and partial names are one flat namespace, so a shared name concatenates
   * the other question's partial into the same file.
   */
  partialName?: string | undefined;
  promptHint: string;
  promptLabel: string;
  settingValue: string;
}

export interface PromptFeatureParams {
  defaultOption: FeatureOption;
  message: string;
  options: readonly FeatureOption[];
  savedValue?: string | undefined;
}

export abstract class FeatureOption {
  public readonly partialName: string;
  public readonly promptHint: string;
  public readonly promptLabel: string;
  public readonly settingValue: string;

  public constructor(config: FeatureOptionConfig) {
    this.settingValue = config.settingValue;
    this.partialName = config.partialName ?? config.settingValue;
    this.promptLabel = config.promptLabel;
    this.promptHint = config.promptHint;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- Base no-op; subclasses override.
  public configure(_builder: TemplateBuilder, _answers: Answers): void {}
}

export async function promptFeature(params: PromptFeatureParams): Promise<string> {
  const result = await select({
    initialValue: params.savedValue ?? params.defaultOption.settingValue,
    message: params.message,
    options: params.options.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue }))
  });
  return result;
}

export function resolveFeature(options: readonly FeatureOption[], value: string): FeatureOption {
  const option = options.find((o) => o.settingValue === value);
  if (!option) {
    throw new Error(`Unknown feature value: ${value}`);
  }
  return option;
}
