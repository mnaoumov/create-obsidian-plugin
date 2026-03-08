export const CONFIG_FILE_NAME = '.create-obsidian-plugin.json';

export enum Mode {
  Create = 'create',
  Update = 'update'
}

export interface Answers {
  apiSubset: string;
  authorGitHubName: string;
  authorName: string;
  buildSystem: string;
  commitLinting: string;
  currentYear: number;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  fundingUrl: string;
  gitHubActions: string;
  gitHubFunding: string;
  gitHubIssueTemplates: string;
  internationalization: string;
  linter: string;
  markdownLinter: string;
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
