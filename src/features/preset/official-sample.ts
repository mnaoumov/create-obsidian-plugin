import { FeatureOption } from '../../feature-option.ts';

/** The `preset` value that copies obsidianmd/obsidian-sample-plugin instead of rendering the templates. */
export const OFFICIAL_SAMPLE_PRESET = 'official-sample';

/**
 * The answers the official sample reads: the plugin's identity, the funding it links to, and the branch `git init`
 * creates. Every other answer is a tooling choice the upstream repository has already made, so none is asked, a
 * flag naming one is refused, and an exported recipe leaves them out.
 */
export const OFFICIAL_SAMPLE_ANSWER_KEYS: readonly string[] = [
  'authorGitHubName',
  'authorName',
  'defaultBranch',
  'fundingPlatform',
  'fundingUrl',
  'fundingUsername',
  'pluginDescription',
  'pluginId',
  'pluginName',
  'preset'
];

/**
 * The official sample plugin, copied as it is upstream.
 *
 * Deliberately not in `PRESET_OPTIONS`: that list is the template presets, which `buildTemplate` composes and the
 * three verification tiers sweep. This one renders no template at all -- it copies a vendored snapshot of
 * obsidianmd/obsidian-sample-plugin and fills in the identity fields (`src/official-sample.ts`).
 */
export class OfficialSample extends FeatureOption {
  public constructor() {
    super({
      promptHint: 'Exactly obsidianmd/obsidian-sample-plugin, with your plugin\'s id, name, author and description filled in',
      promptLabel: 'Official sample plugin',
      settingValue: OFFICIAL_SAMPLE_PRESET
    });
  }
}

/**
 * Whether a preset copies the official sample rather than rendering the templates.
 *
 * @param preset - The preset setting value.
 * @returns Whether it is the official sample.
 */
export function isOfficialSamplePreset(preset: string | undefined): boolean {
  return preset === OFFICIAL_SAMPLE_PRESET;
}
