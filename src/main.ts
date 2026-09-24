import {
  cancel,
  confirm,
  intro,
  log,
  note,
  outro,
  select,
  spinner
} from '@clack/prompts';
import { spawn } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import {
  join,
  resolve as resolvePath
} from 'node:path';
import { compare } from 'semver';

import type {
  Answers,
  GeneratorConfig,
  PackageJson
} from './answers.ts';
import type { CliArgs } from './cli-args.ts';
import type { Overlay } from './overlay.ts';

import {
  formatAnswersJson,
  formatCreateCommand,
  formatCreateScript,
  getScriptExtension,
  getShellForPlatform
} from './answers-export.ts';
import {
  CONFIG_FILE_NAME,
  Mode
} from './answers.ts';
import { assertNotCancelled } from './clack-utils.ts';
import {
  getHelpText,
  parseCliArgs
} from './cli-args.ts';
import { findUnlistableManifestAnswers } from './directory-constraints.ts';
import {
  getInstallCommand,
  getRunCommand
} from './features/package-manager/index.ts';
import {
  loadOverlay,
  toRecordedOverlayPath
} from './overlay.ts';
import {
  getDefaultAnswers,
  promptAnswers
} from './prompts.ts';
import {
  buildTemplate,
  copyTemplates,
  getScriptDir,
  loadConfig
} from './templates.ts';
import {
  fetchLatestObsidianVersion,
  fetchLatestVersion,
  resolveVersions
} from './versions.ts';

interface ExecError extends Error {
  stderr: string;
}

interface ExecResult {
  stderr: string;
  stdout: string;
}

interface ResolvedExternalVersions {
  minAppVersion: string;
  resolvedVersions: ReadonlyMap<string, string>;
}

interface SavedConfig {
  answers?: Answers;
}

/** Where this process's own arguments start: `node` and the script path come first. */
const ARGV_OFFSET = 2;

const JSON_INDENT_SPACES = 2;

/** Owner-writable, everyone-executable: a script the user must `chmod` before running is a poor hand-off. */
const SCRIPT_MODE = 0o755;

/**
 * Refuses to scaffold a plugin the Community directory would not list, naming the flag that fixes it.
 *
 * Only on the create path: `runUpdate` reads an existing project's saved answers, which may predate any
 * of this and are not ours to refuse. The same stderr-then-exit shape as a rejected flag, because that
 * is what this is -- a usage error found one step later than the parser can find it.
 */
function assertManifestAnswersAreListable(answers: Answers): void {
  const problems = findUnlistableManifestAnswers(answers);
  if (problems.length === 0) {
    return;
  }

  const lines = problems.map((problem) => `"${problem.value}" is not a valid ${problem.key}. ${problem.message}.\nPass --${problem.key}=<value> to set it yourself.`);
  exitWithUsageError(lines.join('\n\n'));
}

/**
 * The config to write beside the generated files: the file hashes, the answers and, when one was applied,
 * where the overlay lives -- which is what makes the next update apply it again.
 */
function buildSavedConfig(newConfig: GeneratorConfig, answers: Answers, overlay: null | Overlay, targetDir: string): GeneratorConfig {
  return overlay
    ? { ...newConfig, answers, customTemplate: toRecordedOverlayPath(overlay.dir, targetDir) }
    : { ...newConfig, answers };
}

async function checkForUpdates(currentVersion: string): Promise<void> {
  const latestVer = await fetchLatestVersion('@mnaoumov/create-obsidian-plugin');
  if (latestVer !== null && compare(currentVersion, latestVer) < 0) {
    log.warn(`Your version is outdated. Latest: ${latestVer}. Update with:\n  npm install -g @mnaoumov/create-obsidian-plugin`);
  }
}

async function detectMode(cliArgs: CliArgs): Promise<Mode> {
  if (cliArgs.mode) {
    return cliArgs.mode;
  }

  const configPath = join(process.cwd(), CONFIG_FILE_NAME);
  if (existsSync(configPath)) {
    // Refused rather than defaulted: updating is not safe to assume about a project the caller may have
    // Meant to leave alone, and creating would ignore the one thing detected here.
    if (cliArgs.useDefaults) {
      exitWithUsageError(`Existing project detected (${CONFIG_FILE_NAME}), and --yes cannot ask whether to update it.
Pass --mode=update to update it, or --mode=create to scaffold a new plugin beside it.`);
    }

    const shouldUpdate = await confirm({
      message: 'Existing project detected. Would you like to update it?'
    });
    assertNotCancelled(shouldUpdate);
    return shouldUpdate ? Mode.Update : Mode.Create;
  }
  return Mode.Create;
}

function execAsync(command: string, cwd: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      cwd,
      shell: true,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString('utf-8');
    });

    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        const error = new Error(`Command failed with exit code ${String(exitCode)}`);
        (error as ExecError).stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stderr, stdout });
    });

    child.on('error', reject);
  });
}

/**
 * Stops with a usage error on stderr: a rejected answer, an overlay that does not load, or a question `--yes`
 * would otherwise have had to ask. Under `--yes` there may be nobody to ask, and a prompt with no TTY behind
 * it waits forever -- so the run names the flag that answers it and exits instead.
 */
function exitWithUsageError(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * Loads the overlay or stops with the reason, the same stderr-then-exit shape as a rejected flag: an
 * overlay that does not load is a usage error, and it is found before any question is asked.
 */
function loadOverlayOrExit(dir: string, hint = ''): Overlay {
  try {
    return loadOverlay(dir);
  } catch (error: unknown) {
    exitWithUsageError(`${error instanceof Error ? error.message : String(error)}${hint}`);
  }
}

async function main(): Promise<void> {
  const packageJsonPath = join(getScriptDir(), '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  const currentVersion = packageJson.version ?? '0.0.0';

  const m = '\x1b[38;5;135m';
  const r = '\x1b[0m';
  const banner = `
       ${m}◆${r}
      ${m}◆ ◆${r}
     ${m}◆ ◆ ◆${r}    ${m}create-obsidian-plugin${r}
      ${m}◆ ◆${r}     ${m}v${currentVersion}${r}
       ${m}◆${r}      ${m}@mnaoumov${r}

`;
  let cliArgs;
  try {
    cliArgs = parseCliArgs(process.argv.slice(ARGV_OFFSET));
  } catch (error: unknown) {
    // Straight to stderr, before the banner: a rejected flag is a usage error, and burying it under the
    // Intro would make it look like the run had started.
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }

  if (cliArgs.showHelp) {
    process.stdout.write(`${getHelpText()}\n`);
    return;
  }

  process.stdout.write(banner);
  intro('Let\'s build an Obsidian plugin!');

  await checkForUpdates(currentVersion);

  const mode = await detectMode(cliArgs);

  if (mode === Mode.Create) {
    await runCreate(currentVersion, cliArgs);
  } else {
    await runUpdate(currentVersion, cliArgs);
  }
}

/**
 * Offers to save the answers just given as a runnable script or as an answers file, before scaffolding.
 *
 * The menu loops rather than being a one-shot choice, so both forms can be captured in one session -- a
 * save is never at the expense of the generation the user came for.
 *
 * The executable-bit on the `sh` form matters: a script the user has to `chmod` before running is a
 * worse hand-off than the command they could already have copied off the screen.
 */
async function offerAnswersExport(answers: Answers, customTemplate: string | undefined): Promise<void> {
  const shell = getShellForPlatform(process.platform);
  const scriptName = `obsidian-${answers.pluginId}-create${getScriptExtension(shell)}`;
  const answersFileName = `obsidian-${answers.pluginId}-answers.json`;

  async function ask(): Promise<string> {
    const choice = await select({
      initialValue: 'generate',
      message: 'Your answers are collected.',
      options: [
        { hint: 'Scaffold the plugin now', label: 'Start generation', value: 'generate' },
        { hint: scriptName, label: 'Save a script for non-interactive generation', value: 'script' },
        { hint: answersFileName, label: 'Save an answers file for non-interactive generation', value: 'answers' }
      ]
    });
    assertNotCancelled(choice);
    return choice;
  }

  let choice = await ask();

  while (choice !== 'generate') {
    if (choice === 'script') {
      const scriptPath = join(process.cwd(), scriptName);
      writeFileSync(scriptPath, formatCreateScript(answers, shell, customTemplate));
      if (shell === 'sh') {
        chmodSync(scriptPath, SCRIPT_MODE);
      }
      log.success(`Wrote ${scriptName}`);
      note(formatCreateCommand(answers, shell, customTemplate), 'Non-interactive command');
    } else {
      writeFileSync(join(process.cwd(), answersFileName), formatAnswersJson(answers));
      log.success(`Wrote ${answersFileName}`);
      const overlayFlag = customTemplate ? ` --customTemplate=${customTemplate}` : '';
      note(`npm create @mnaoumov/obsidian-plugin -- --yes --mode=create --answersFile=${answersFileName}${overlayFlag}`, 'Non-interactive command');
    }

    choice = await ask();
  }
}

// The `minAppVersion` is looked up here, next to the dependency versions, for the same reason they are:
// `copyTemplates` is synchronous and must not touch the network, so everything fetched is resolved before
// It runs and handed in.
async function resolveExternalVersions(answers: Answers, overlay: null | Overlay): Promise<ResolvedExternalVersions> {
  const s = spinner();
  s.start('Resolving versions...');
  const [resolvedVersions, minAppVersion] = await Promise.all([
    resolveVersions(buildTemplate(answers, overlay).dependencies),
    fetchLatestObsidianVersion()
  ]);
  s.stop('Versions resolved.');
  return { minAppVersion, resolvedVersions };
}

async function runCreate(currentVersion: string, cliArgs: CliArgs): Promise<void> {
  const { answers: suppliedAnswers, customTemplate, useDefaults } = cliArgs;
  const overlay = customTemplate ? loadOverlayOrExit(resolvePath(customTemplate)) : null;
  const answers = useDefaults ? getDefaultAnswers(suppliedAnswers) : await promptAnswers(suppliedAnswers);
  assertManifestAnswersAreListable(answers);

  // Not under `--yes`: that path is what an exported script itself runs, so offering to export from
  // Inside it would be asking a question of a run that exists to ask none.
  if (!useDefaults) {
    await offerAnswersExport(answers, customTemplate);
  }

  const targetDir = join(process.cwd(), `obsidian-${answers.pluginId}`);

  if (existsSync(targetDir) && !cliArgs.force) {
    // The prompt's own default is no, but taking it silently would exit 0 having generated nothing.
    if (useDefaults) {
      exitWithUsageError(`Directory obsidian-${answers.pluginId} already exists, and --yes cannot ask whether to scaffold into it.
Pass --force to scaffold into it anyway.`);
    }

    const shouldContinue = await confirm({
      initialValue: false,
      message: `Directory obsidian-${answers.pluginId} already exists. Continue anyway?`
    });
    assertNotCancelled(shouldContinue);
    if (!shouldContinue) {
      cancel('Aborted.');
      process.exit(0);
    }
  }

  const { minAppVersion, resolvedVersions } = await resolveExternalVersions(answers, overlay);

  const s = spinner();
  s.start('Scaffolding plugin...');
  const newConfig = copyTemplates(answers, targetDir, currentVersion, null, resolvedVersions, minAppVersion, overlay);
  const configPath = join(targetDir, CONFIG_FILE_NAME);
  const configWithAnswers = buildSavedConfig(newConfig, answers, overlay, targetDir);
  writeFileSync(configPath, `${JSON.stringify(configWithAnswers, null, JSON_INDENT_SPACES)}\n`);
  s.stop('Plugin scaffolded.');

  if (!useDefaults) {
    await runPostScaffold(targetDir, answers);
  }

  const pm = answers.packageManager;
  const dirName = `obsidian-${answers.pluginId}`;
  const needsInstall = !existsSync(join(targetDir, 'node_modules'));
  const steps = [
    ...(needsInstall ? [getInstallCommand(pm)] : []),
    getRunCommand(pm, 'dev')
  ];

  note(`cd ${dirName} && ${steps.join(' && ')}`, 'Next steps');
  outro('Happy coding!');
}

// The templates are authored in one style, the one the compared plugins use. dprint is configured to
// Match it, but prettier and biome cannot be configured to reproduce it byte for byte -- biome
// Collapses an empty object to
// `{}` whatever the settings say -- so a project that picked either of those would be committed
// Already failing its own `format:check`. Formatting once here settles that, in the tool's own style,
// Before the initial commit is taken.
async function runInitialFormat(targetDir: string, answers: Answers, isInstalled: boolean): Promise<void> {
  if (!isInstalled || answers.formatter === 'none') {
    return;
  }

  const s = spinner();
  s.start('Formatting...');
  try {
    await execAsync(getRunCommand(answers.packageManager, 'format'), targetDir);
    s.stop('Formatted.');
  } catch {
    s.stop('Failed to format. Run `format` manually.');
  }
}

async function runPostScaffold(targetDir: string, answers: Answers): Promise<void> {
  const pm = answers.packageManager;
  const installCmd = getInstallCommand(pm);

  const shouldInstall = await confirm({
    initialValue: true,
    message: `Install dependencies with ${pm}?`
  });
  assertNotCancelled(shouldInstall);

  let isInstalled = false;

  if (shouldInstall) {
    const s = spinner();
    s.start('Installing dependencies...');
    try {
      await execAsync(installCmd, targetDir);
      isInstalled = true;
      s.stop('Dependencies installed.');
    } catch (error: unknown) {
      s.stop(`Failed to install dependencies. Run \`${installCmd}\` manually.`);
      if (error instanceof Error && 'stderr' in error) {
        log.error(String(error.stderr));
      }
    }
  }

  await runInitialFormat(targetDir, answers, isInstalled);

  const shouldGitInit = await confirm({
    initialValue: true,
    message: 'Initialize a git repository?'
  });
  assertNotCancelled(shouldGitInit);

  if (shouldGitInit) {
    const s = spinner();
    s.start('Initializing git repository...');
    try {
      // `-b` rather than a bare `git init`: without it the branch is whatever the user's
      // `init.defaultBranch` says, which need not be the branch the generated CI workflow triggers on --
      // A mismatch produces a repo whose CI never fires. Both come from the same answer.
      await execAsync(`git init -b ${answers.defaultBranch}`, targetDir);
      await execAsync('git add -A', targetDir);
      await execAsync('git commit -m "Initial commit from create-obsidian-plugin"', targetDir);
      s.stop('Git repository initialized with initial commit.');
    } catch {
      s.stop('Failed to initialize git. Run `git init` manually.');
    }
  }

  const shouldCreateGitHubRepo = await confirm({
    initialValue: false,
    message: 'Create a GitHub repository?'
  });
  assertNotCancelled(shouldCreateGitHubRepo);

  if (shouldCreateGitHubRepo) {
    const s = spinner();
    s.start('Creating GitHub repository...');
    try {
      await execAsync(`gh repo create obsidian-${answers.pluginId} --public --source=. --push`, targetDir);
      s.stop('GitHub repository created and pushed.');
    } catch {
      s.stop('Failed to create GitHub repo. Make sure `gh` CLI is installed and authenticated.');
    }
  }
}

async function runUpdate(currentVersion: string, cliArgs: CliArgs): Promise<void> {
  const { answers: suppliedAnswers, customTemplate, useDefaults } = cliArgs;
  const targetDir = process.cwd();
  const existingConfig = loadConfig(targetDir);

  if (!existingConfig) {
    log.error('No config file found. Cannot update.');
    process.exit(1);
  }

  log.info(`Current project was generated with v${existingConfig.generatorVersion}`);

  // The recorded overlay is re-applied unless a flag names another one or, given empty, drops it. A recorded
  // One that is gone is refused rather than skipped: skipping would regenerate every file it overrode from
  // The built-ins, and each of those still matches its recorded hash, so all of them would be overwritten.
  let overlay: null | Overlay = null;
  if (customTemplate !== undefined) {
    overlay = customTemplate ? loadOverlayOrExit(resolvePath(customTemplate)) : null;
  } else if (existingConfig.customTemplate) {
    overlay = loadOverlayOrExit(
      resolvePath(targetDir, existingConfig.customTemplate),
      `
This project records it in ${CONFIG_FILE_NAME}. Pass --customTemplate=<dir> to point at where it is now, or --customTemplate= to stop using it.`
    );
    log.info(`Applying the custom template recorded for this project: ${existingConfig.customTemplate}`);
  }

  const configPath = join(targetDir, CONFIG_FILE_NAME);
  const savedConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as SavedConfig;

  let answers: Answers;

  if (savedConfig.answers) {
    // A flag beats the saved answer, which is what makes `--<key>=<value>` a way to CHANGE one setting on
    // An existing project without walking the whole wizard again.
    const saved: Answers = { ...savedConfig.answers, ...suppliedAnswers };
    log.info('Using saved answers from previous generation.');
    // Under `--yes` the flags ARE the changes, so there is nothing left to ask.
    const shouldRePrompt = useDefaults
      ? false
      : await confirm({
        initialValue: false,
        message: 'Would you like to change any settings?'
      });
    assertNotCancelled(shouldRePrompt);

    if (shouldRePrompt) {
      answers = await promptAnswers(saved);
    } else {
      answers = saved;
    }
  } else {
    // Not the defaults: each of them, the plugin id first, would be a guess about a project that exists.
    if (useDefaults) {
      exitWithUsageError(`${CONFIG_FILE_NAME} records no answers, so --yes has none to reuse.
Run without --yes to answer them again.`);
    }
    log.warn('No saved answers found. Please provide the settings again.');
    answers = await promptAnswers(suppliedAnswers);
  }

  // A project that has already released carries a `manifest.json` its own `npm run version` rewrote, so its
  // Hash no longer matches the recorded one and the updater skips it -- the freshly looked-up
  // `minAppVersion` only ever reaches a manifest nobody has touched.
  const { minAppVersion, resolvedVersions } = await resolveExternalVersions(answers, overlay);

  const s = spinner();
  s.start('Updating project files...');
  copyTemplates(answers, targetDir, currentVersion, existingConfig, resolvedVersions, minAppVersion, overlay);
  s.stop('Update complete.');

  const newConfig = loadConfig(targetDir);
  if (newConfig) {
    const configWithAnswers = buildSavedConfig(newConfig, answers, overlay, targetDir);
    writeFileSync(configPath, `${JSON.stringify(configWithAnswers, null, JSON_INDENT_SPACES)}\n`);
  }

  outro('Project updated successfully!');
}

await main();
