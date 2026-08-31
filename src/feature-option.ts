import type { Answers } from './answers.ts';
import type { TemplateBuilder } from './template-builder.ts';

import { select } from './clack-select.ts';

export interface FeatureOptionConfig {
  /**
   * The JSX runtime this option compiles its components with, for the options that own one.
   *
   * `jsx` / `jsxImportSource` are project-global -- one value in the tsconfig, and one more in whichever
   * bundler config was chosen -- so a project can demonstrate exactly ONE of them. Recorded here rather
   * than as a list in `templates.ts` so that a UI framework added later cannot silently reintroduce the
   * collision this exists to detect. `undefined` for every option that owns no pragma: `none` and `lit`
   * emit no JSX at all, and `svelte` / `vue` compile their own single-file components, which is what
   * lets them coexist with any of the three that do.
   */
  jsxImportSource?: string | undefined;
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
  public readonly jsxImportSource: string | undefined;
  public readonly partialName: string;
  public readonly promptHint: string;
  public readonly promptLabel: string;
  public readonly settingValue: string;

  public constructor(config: FeatureOptionConfig) {
    this.settingValue = config.settingValue;
    this.jsxImportSource = config.jsxImportSource;
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
