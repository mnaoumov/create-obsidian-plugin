export const CONFIG_FILE_NAME = '.create-obsidian-plugin.json';

export enum Mode {
  Create = 'create',
  Update = 'update'
}

export interface Answers {
  apiSubset: string;
  authorGitHubName: string;
  authorName: string;
  bundler: string;
  commitLinting: string;
  coverageBadge: string;
  currentYear: number;
  defaultBranch: string;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  fundingPlatform: string;
  fundingUrl: string;
  fundingUsername: string;
  gitHubActions: string;
  gitHubIssueTemplates: string;
  hotReload: string;
  internationalization: string;
  linter: string;
  markdownLinter: string;
  obsidianConfigFolder: string;
  packageManager: string;
  platformSupport: string;
  pluginDescription: string;
  pluginId: string;
  pluginName: string;
  preset: string;
  spellChecker: string;
  styling: string;
  testRunner: string;
  uiFramework: string;
  wasmSupport: string;
}

export interface GeneratorConfig {
  answers?: Answers;
  /**
   * The overlay directory the project was generated with, relative to the project where possible. Recorded
   * so an update re-applies it: the updater compares each file against the hash it recorded, so an overlay
   * dropped on the next run would silently revert every file it had overridden.
   */
  customTemplate?: string;
  fileHashes: Record<string, string>;
  generatorVersion: string;
}

export interface PackageJson {
  description?: string;
  name?: string;
  version?: string;
}

/**
 * The {@link Answers} keys whose answer is a string -- every question, plus the free-text answers.
 *
 * Excludes `currentYear`, the one numeric field, so an answer-space dimension cannot be declared against
 * a key it could not write a `settingValue` into.
 */
export type StringAnswerKey = { [Key in keyof Answers]: Answers[Key] extends string ? Key : never }[keyof Answers];

/**
 * The PascalCase stem of the plugin's class names (`<Short>Plugin`, `<Short>SettingTab`), derived from the id.
 *
 * Derived at render time rather than stored as an answer. It used to be an {@link Answers} field that the
 * `--yes` path let a caller override and the interactive path recomputed, so one supplied value meant two
 * different things; a stored copy also went stale whenever `pluginId` was re-answered on an update.
 */
export function getPluginShortName(pluginId: string): string {
  return pluginId.split('-').map((word) => (word[0] ?? '').toUpperCase() + word.slice(1)).join('');
}
