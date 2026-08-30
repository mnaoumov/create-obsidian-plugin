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
  currentYear: number;
  defaultBranch: string;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  fundingUrl: string;
  gitHubActions: string;
  gitHubFunding: string;
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
  pluginShortName: string;
  preset: string;
  spellChecker: string;
  styling: string;
  testRunner: string;
  uiFramework: string;
  wasmSupport: string;
}

export interface GeneratorConfig {
  answers?: Answers;
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
