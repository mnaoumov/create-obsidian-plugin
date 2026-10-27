export const CONFIG_FILE_NAME = '.create-obsidian-plugin.json';

export enum Mode {
  Create = 'create',
  Update = 'update'
}

export interface Answers {
  readonly apiSubset: string;
  readonly authorGitHubName: string;
  readonly authorName: string;
  readonly bundler: string;
  readonly commitLinting: string;
  readonly coverageBadge: string;
  readonly currentYear: number;
  readonly defaultBranch: string;
  readonly e2eTestRunner: string;
  readonly editorExtensions: string;
  readonly formatter: string;
  readonly fundingPlatform: string;
  readonly fundingUrl: string;
  readonly fundingUsername: string;
  readonly gitHubActions: string;
  readonly gitHubIssueTemplates: string;
  readonly hotReload: string;
  readonly internationalization: string;
  readonly linter: string;
  readonly markdownLinter: string;
  readonly obsidianConfigFolder: string;
  readonly packageManager: string;
  readonly platformSupport: string;
  readonly pluginDescription: string;
  readonly pluginId: string;
  readonly pluginName: string;
  readonly preset: string;
  readonly spellChecker: string;
  readonly styling: string;
  readonly testRunner: string;
  readonly uiFramework: string;
  readonly wasmSupport: string;
}

export interface GeneratorConfig {
  readonly answers?: Answers;
  /**
   * The overlay directory the project was generated with, relative to the project where possible. Recorded
   * so an update re-applies it: the updater compares each file against the hash it recorded, so an overlay
   * dropped on the next run would silently revert every file it had overridden.
   */
  readonly customTemplate?: string;
  readonly fileHashes: Record<string, string>;
  readonly generatorVersion: string;
  /** The upstream commit an official-sample project was copied from. Absent on every template preset. */
  readonly upstreamCommit?: string;
}

export interface PackageJson {
  readonly description?: string;
  readonly name?: string;
  readonly scripts?: Record<string, string>;
  readonly version?: string;
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
