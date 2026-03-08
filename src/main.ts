import {
  cancel,
  confirm,
  intro,
  log,
  note,
  outro,
  spinner
} from '@clack/prompts';
import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { compare } from 'semver';

import type {
  Answers,
  PackageJson
} from './Answers.ts';

import {
  CONFIG_FILE_NAME,
  Mode
} from './Answers.ts';
import { assertNotCancelled } from './clack-utils.ts';
import {
  getInstallCommand,
  getRunCommand
} from './features/PackageManager/index.ts';
import { promptAnswers } from './prompts.ts';
import {
  copyTemplates,
  getScriptDir,
  loadConfig
} from './templates.ts';

const JSON_INDENT_SPACES = 2;

async function checkForUpdates(currentVersion: string): Promise<void> {
  try {
    const latestVer = await latestVersion('@mnaoumov/create-obsidian-plugin');
    if (compare(currentVersion, latestVer) < 0) {
      log.warn(`Your version is outdated. Latest: ${latestVer}. Update with:\n  npm install -g @mnaoumov/create-obsidian-plugin`);
    }
  } catch {
    // Silently ignore network errors
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

async function latestVersion(packageName: string): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
  const json = await response.json() as Record<string, unknown>;
  return json['version'] as string;
}

async function main(): Promise<void> {
  const packageJsonPath = join(getScriptDir(), '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  const currentVersion = packageJson.version ?? '0.0.0';

  const banner = `
    \x1b[35m╱╲\x1b[0m
   \x1b[35m╱  ╲\x1b[0m       \x1b[1m@mnaoumov/create-obsidian-plugin\x1b[0m
  \x1b[35m╱ ◆  ╲\x1b[0m      v${currentVersion}
 \x1b[35m╱      ╲\x1b[0m
\x1b[35m╱________╲\x1b[0m     Scaffold modern Obsidian plugins
`;
  process.stdout.write(banner);
  intro('');

  await checkForUpdates(currentVersion);

  const mode = await detectMode();

  if (mode === Mode.Create) {
    await runCreate(currentVersion);
  } else {
    await runUpdate(currentVersion);
  }
}

async function runCreate(currentVersion: string): Promise<void> {
  const answers = await promptAnswers();
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

  const s = spinner();
  s.start('Scaffolding plugin...');
  copyTemplates(answers, targetDir, currentVersion, null);
  s.stop('Plugin scaffolded.');

  await runPostScaffold(targetDir, answers);

  const pm = answers.packageManager;
  const nextSteps = [
    `cd obsidian-${answers.pluginId}`,
    ...(existsSync(join(targetDir, 'node_modules')) ? [] : [getInstallCommand(pm)]),
    getRunCommand(pm, 'dev')
  ];

  note(nextSteps.join('\n'), 'Next steps');
  outro('Happy coding!');
}

async function runPostScaffold(targetDir: string, answers: Answers): Promise<void> {
  const pm = answers.packageManager;
  const installCmd = getInstallCommand(pm);

  const shouldInstall = await confirm({
    initialValue: true,
    message: `Install dependencies with ${pm}?`
  });
  assertNotCancelled(shouldInstall);

  if (shouldInstall) {
    const s = spinner();
    s.start('Installing dependencies...');
    try {
      execSync(installCmd, { cwd: targetDir, stdio: 'pipe' });
      s.stop('Dependencies installed.');
    } catch {
      s.stop(`Failed to install dependencies. Run \`${installCmd}\` manually.`);
    }
  }

  const shouldGitInit = await confirm({
    initialValue: true,
    message: 'Initialize a git repository?'
  });
  assertNotCancelled(shouldGitInit);

  if (shouldGitInit) {
    const s = spinner();
    s.start('Initializing git repository...');
    try {
      execSync('git init', { cwd: targetDir, stdio: 'pipe' });
      execSync('git add -A', { cwd: targetDir, stdio: 'pipe' });
      execSync('git commit -m "Initial commit from create-obsidian-plugin"', { cwd: targetDir, stdio: 'pipe' });
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
      execSync(`gh repo create obsidian-${answers.pluginId} --public --source=. --push`, {
        cwd: targetDir,
        stdio: 'pipe'
      });
      s.stop('GitHub repository created and pushed.');
    } catch {
      s.stop('Failed to create GitHub repo. Make sure `gh` CLI is installed and authenticated.');
    }
  }
}

async function runUpdate(currentVersion: string): Promise<void> {
  const targetDir = process.cwd();
  const existingConfig = loadConfig(targetDir);

  if (!existingConfig) {
    log.error('No config file found. Cannot update.');
    process.exit(1);
  }

  log.info(`Current project was generated with v${existingConfig.generatorVersion}`);

  const configPath = join(targetDir, CONFIG_FILE_NAME);
  const savedConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as { answers?: Answers };

  let answers: Answers;

  if (savedConfig.answers) {
    log.info('Using saved answers from previous generation.');
    const shouldRePrompt = await confirm({
      initialValue: false,
      message: 'Would you like to change any settings?'
    });
    assertNotCancelled(shouldRePrompt);

    if (shouldRePrompt) {
      answers = await promptAnswers(savedConfig.answers);
    } else {
      answers = savedConfig.answers;
    }
  } else {
    log.warn('No saved answers found. Please provide the settings again.');
    answers = await promptAnswers();
  }

  const s = spinner();
  s.start('Updating project files...');
  copyTemplates(answers, targetDir, currentVersion, existingConfig);
  s.stop('Update complete.');

  const newConfig = loadConfig(targetDir);
  if (newConfig) {
    const configWithAnswers = { ...newConfig, answers };
    writeFileSync(configPath, `${JSON.stringify(configWithAnswers, null, JSON_INDENT_SPACES)}\n`);
  }

  outro('Project updated successfully!');
}

await main();
