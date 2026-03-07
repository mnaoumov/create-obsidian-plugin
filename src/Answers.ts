export const CONFIG_FILE_NAME = '.create-obsidian-plugin.json';

export enum Mode {
  Create = 'create',
  Update = 'update'
}

export interface Answers {
  // Feature settings (plain strings matching settingValue on FeatureOption classes)
  apiSubset: string;
  // Metadata
  authorGitHubName: string;
  authorName: string;
  buildSystem: string;
  cssMode: string;
  currentYear: number;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  framework: string;
  fundingUrl: string;
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
  testRunner: string;
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
