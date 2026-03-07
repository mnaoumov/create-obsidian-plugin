export const CONFIG_FILE_NAME = '.create-obsidian-plugin.json';

export enum Mode {
  Create = 'create',
  Update = 'update'
}

export interface AnswerFeatures {
  apiSubset: string;
  buildSystem: string;
  cssMode: string;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  framework: string;
  linter: string;
  markdownLinter: string;
  packageManager: string;
  platformSupport: string;
  preset: string;
  spellChecker: string;
  testRunner: string;
  wasmSupport: string;
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
  // Derived booleans for template compatibility
  hasCspell: boolean;
  hasCss: boolean;
  hasE2eTests: boolean;
  hasEditorExtensions: boolean;

  hasEslint: boolean;
  hasMarkdownLint: boolean;
  hasPrettier: boolean;
  hasScss: boolean;
  hasTests: boolean;
  hasWasm: boolean;
  isDesktopOnly: boolean;
  linter: string;

  markdownLinter: string;
  packageManager: string;
  platformSupport: string;
  pluginDescription: string;
  pluginId: string;
  pluginName: string;
  pluginShortName: string;
  preset: string;
  shouldEnableUnofficialInternalObsidianApi: boolean;
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

export function buildDerivedBooleans(features: AnswerFeatures): Pick<Answers, 'hasCspell' | 'hasCss' | 'hasE2eTests' | 'hasEditorExtensions' | 'hasEslint' | 'hasMarkdownLint' | 'hasPrettier' | 'hasScss' | 'hasTests' | 'hasWasm' | 'isDesktopOnly' | 'shouldEnableUnofficialInternalObsidianApi'> {
  return {
    hasCspell: features.spellChecker === 'cspell',
    hasCss: features.cssMode !== 'none',
    hasE2eTests: features.e2eTestRunner !== 'none',
    hasEditorExtensions: features.editorExtensions === 'codemirror',
    hasEslint: features.linter === 'eslint',
    hasMarkdownLint: features.markdownLinter === 'markdownlint',
    hasPrettier: features.formatter === 'prettier',
    hasScss: features.cssMode === 'scss',
    hasTests: features.testRunner !== 'none',
    hasWasm: features.wasmSupport === 'wasm',
    isDesktopOnly: features.platformSupport === 'desktop-only',
    shouldEnableUnofficialInternalObsidianApi: features.apiSubset === 'with-unofficial'
  };
}
