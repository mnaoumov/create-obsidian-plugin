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
import { join } from 'node:path';
import { compare } from 'semver';

import type {
  Answers,
  PackageJson
} from './answers.ts';

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
import {
  getInstallCommand,
  getRunCommand
} from './features/package-manager/index.ts';
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

async function checkForUpdates(currentVersion: string): Promise<void> {
  const latestVer = await fetchLatestVersion('@mnaoumov/create-obsidian-plugin');
  if (latestVer !== null && compare(currentVersion, latestVer) < 0) {
    log.warn(`Your version is outdated. Latest: ${latestVer}. Update with:\n  npm install -g @mnaoumov/create-obsidian-plugin`);
  }
}

async function detectMode(): Promise<Mode> {
  const configPath = join(process.cwd(), CONFIG_FILE_NAME);
  if (existsSync(configPath)) {
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

  const mode = await detectMode();

  if (mode === Mode.Create) {
    await runCreate(currentVersion, cliArgs.useDefaults, cliArgs.answers);
  } else {
    await runUpdate(currentVersion, cliArgs.answers);
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
async function offerAnswersExport(answers: Answers): Promise<void> {
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
      writeFileSync(scriptPath, formatCreateScript(answers, shell));
      if (shell === 'sh') {
        chmodSync(scriptPath, SCRIPT_MODE);
      }
      log.success(`Wrote ${scriptName}`);
      note(formatCreateCommand(answers, shell), 'Non-interactive command');
    } else {
      writeFileSync(join(process.cwd(), answersFileName), formatAnswersJson(answers));
      log.success(`Wrote ${answersFileName}`);
      note(`npm create @mnaoumov/obsidian-plugin -- --yes --answersFile=${answersFileName}`, 'Non-interactive command');
    }

    choice = await ask();
  }
}

// The `minAppVersion` is looked up here, next to the dependency versions, for the same reason they are:
// `copyTemplates` is synchronous and must not touch the network, so everything fetched is resolved before
// It runs and handed in.
async function resolveExternalVersions(answers: Answers): Promise<ResolvedExternalVersions> {
  const s = spinner();
  s.start('Resolving versions...');
  const [resolvedVersions, minAppVersion] = await Promise.all([
    resolveVersions(buildTemplate(answers).dependencies),
    fetchLatestObsidianVersion()
  ]);
  s.stop('Versions resolved.');
  return { minAppVersion, resolvedVersions };
}

async function runCreate(currentVersion: string, useDefaults: boolean, suppliedAnswers: Partial<Answers>): Promise<void> {
  const answers = useDefaults ? getDefaultAnswers(suppliedAnswers) : await promptAnswers(suppliedAnswers);

  // Not under `--yes`: that path is what an exported script itself runs, so offering to export from
  // Inside it would be asking a question of a run that exists to ask none.
  if (!useDefaults) {
    await offerAnswersExport(answers);
  }

  const targetDir = join(process.cwd(), `obsidian-${answers.pluginId}`);

  if (existsSync(targetDir)) {
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

  const { minAppVersion, resolvedVersions } = await resolveExternalVersions(answers);

  const s = spinner();
  s.start('Scaffolding plugin...');
  const newConfig = copyTemplates(answers, targetDir, currentVersion, null, resolvedVersions, minAppVersion);
  const configPath = join(targetDir, CONFIG_FILE_NAME);
  const configWithAnswers = { ...newConfig, answers };
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

// The templates are authored in one style, the fleet's. dprint is configured to match it, but prettier
// And biome cannot be configured to reproduce it byte for byte -- biome collapses an empty object to
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

async function runUpdate(currentVersion: string, suppliedAnswers: Partial<Answers>): Promise<void> {
  const targetDir = process.cwd();
  const existingConfig = loadConfig(targetDir);

  if (!existingConfig) {
    log.error('No config file found. Cannot update.');
    process.exit(1);
  }

  log.info(`Current project was generated with v${existingConfig.generatorVersion}`);

  const configPath = join(targetDir, CONFIG_FILE_NAME);
  const savedConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as SavedConfig;

  let answers: Answers;

  if (savedConfig.answers) {
    // A flag beats the saved answer, which is what makes `--<key>=<value>` a way to CHANGE one setting on
    // An existing project without walking the whole wizard again.
    const saved: Answers = { ...savedConfig.answers, ...suppliedAnswers };
    log.info('Using saved answers from previous generation.');
    const shouldRePrompt = await confirm({
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
    log.warn('No saved answers found. Please provide the settings again.');
    answers = await promptAnswers(suppliedAnswers);
  }

  // A project that has already released carries a `manifest.json` its own `npm run version` rewrote, so its
  // Hash no longer matches the recorded one and the updater skips it -- the freshly looked-up
  // `minAppVersion` only ever reaches a manifest nobody has touched.
  const { minAppVersion, resolvedVersions } = await resolveExternalVersions(answers);

  const s = spinner();
  s.start('Updating project files...');
  copyTemplates(answers, targetDir, currentVersion, existingConfig, resolvedVersions, minAppVersion);
  s.stop('Update complete.');

  const newConfig = loadConfig(targetDir);
  if (newConfig) {
    const configWithAnswers = { ...newConfig, answers };
    writeFileSync(configPath, `${JSON.stringify(configWithAnswers, null, JSON_INDENT_SPACES)}\n`);
  }

  outro('Project updated successfully!');
}

await main();
