/**
 * The command, tool, library, framework, package and service names that Markdown prose marks as code.
 *
 * Every spelling is matched exactly as written here, case and all. A name with a common spelling in another case
 * (`ESLint` and `eslint`) lists both. A name that is also an ordinary English word in lowercase (`Jest`, `Lit`,
 * `Solid`, `Parcel`, `Rollup`, `Sass`, `React`, `Prettier`, ...) lists only its capitalized form, so "a solid
 * default" and "the rollup of changes" stay prose. `TypeScript` is left out: it names the language at least as
 * often as the compiler, and only the compiler is a tool.
 */

/** Command-line tools and package managers. Lowercase only: `Node.js` the project and `Git` the system stay plain. */
const COMMANDS = ['bun', 'gh', 'git', 'jiti', 'node', 'npm', 'npx', 'pnpm', 'tsc', 'yarn'];

/** Shells. `cmd` and `bash` are lowercase as typed; `PowerShell` is its name, while `pwsh` is the command. */
const SHELLS = ['bash', 'cmd', 'PowerShell', 'pwsh'];

/** Bundlers and build tools. */
const BUNDLERS = ['esbuild', 'Parcel', 'Rollup', 'Vite', 'vite', 'Webpack', 'webpack', 'Babel'];

/** UI frameworks and their runtimes. */
const UI_FRAMEWORKS = ['Lit', 'Preact', 'preact', 'React', 'Solid', 'Svelte', 'svelte', 'Vue', 'vue'];

/** Test runners, end-to-end tools and their helpers. */
const TEST_TOOLS = [
  'Jest',
  'jsdom',
  'Playwright',
  'ts-jest',
  'Vitest',
  'vitest',
  'wdio-obsidian-service',
  'WebdriverIO',
  'webdriverio'
];

/** Linters, formatters, spell checkers and the other checks a project runs. */
const CHECKERS = [
  'Biome',
  'commitlint',
  'cspell',
  'CSpell',
  'depcheck',
  'dprint',
  'ESLint',
  'eslint',
  'linkinator',
  'markdownlint',
  'markdownlint-cli2',
  'Prettier',
  'svelte-check',
  'typescript-eslint'
];

/** Styling tools and template engines. */
const STYLING = ['autoprefixer', 'CSS Modules', 'EJS', 'PostCSS', 'Sass', 'SCSS', 'Tailwind', 'Tailwind CSS'];

/** Git hooks and their runners. */
const GIT_HOOKS = ['husky', 'nano-staged'];

/** Documentation tools. */
const DOCS_TOOLS = ['API Documenter', 'Astro', 'Starlight'];

/** Packages a generated project depends on, named in prose by their package name. */
const PACKAGES = [
  'i18next',
  'obsidian-dev-toolkit',
  'obsidian-dev-utils',
  'obsidian-integration-testing',
  'obsidian-lib',
  'obsidian-test-mocks',
  'obsidian-typings',
  'typesafe-i18n',
  'typescript-dev-toolkit',
  'typescript-lib'
];

/**
 * Services, marked wherever they are named, and formats a project builds. `GitHub` is a whole word only, so
 * `GitHub Actions`, `GitHub Pages` and `GitHub Sponsors` are each one span and `github.com` and URLs stay plain.
 */
const SERVICES = [
  'Dependabot',
  'Discord',
  'GitHub',
  'GitHub Actions',
  'GitHub Pages',
  'GitHub Sponsors',
  'Telegram',
  'WebAssembly'
];

/** Every spelling the check looks for. */
export const TOOL_NAMES: readonly string[] = [
  ...COMMANDS,
  ...SHELLS,
  ...BUNDLERS,
  ...UI_FRAMEWORKS,
  ...TEST_TOOLS,
  ...CHECKERS,
  ...STYLING,
  ...GIT_HOOKS,
  ...DOCS_TOOLS,
  ...PACKAGES,
  ...SERVICES
];
