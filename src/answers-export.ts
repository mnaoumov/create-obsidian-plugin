import type { Answers } from './answers.ts';

import {
  DEMO_PINNED_ANSWER_KEYS,
  getAnswerableKeys
} from './cli-args.ts';

/** Which shell an exported create-script is written for. */
export type Shell = 'cmd' | 'sh';

/** One package manager's `create` invocation, split at the point flags stop being the manager's own. */
interface CreateCommand {
  /** Everything up to and including the package name. */
  readonly prefix: string;
  /** What has to sit between the package name and the initializer's flags, if anything. */
  readonly separator: string;
}

/**
 * How each package manager's `create` form takes flags meant for the initializer rather than for itself.
 *
 * npm needs an explicit `--`; the other three forward what follows the package name straight through.
 * The commands themselves mirror the create table in `README.md`.
 */
const CREATE_COMMANDS: Readonly<Record<string, CreateCommand>> = {
  bun: { prefix: 'bun create @mnaoumov/obsidian-plugin', separator: '' },
  npm: { prefix: 'npm create @mnaoumov/obsidian-plugin', separator: ' --' },
  pnpm: { prefix: 'pnpm create @mnaoumov/obsidian-plugin', separator: '' },
  yarn: { prefix: 'yarn create @mnaoumov/obsidian-plugin', separator: '' }
};

const JSON_INDENT_SPACES = 2;

/**
 * The answers as a file `--answersFile` reads back.
 *
 * Every answerable key is written, never just the ones that differ from a default. A recipe that omits
 * defaults stops reproducing the same project the moment a default moves in a later release, which is
 * exactly what capturing it was for.
 */
export function formatAnswersJson(answers: Answers): string {
  const exported: Record<string, string> = {};
  for (const key of getExportableKeys(answers)) {
    exported[key] = String(answers[key as keyof Answers]);
  }
  return `${JSON.stringify(exported, null, JSON_INDENT_SPACES)}\n`;
}

/**
 * The create command itself, without the script preamble.
 *
 * `--yes` is included because the flags alone only settle the ANSWERS: without it the run still stops at
 * the post-scaffold install / git / GitHub prompts, so the script would not be non-interactive.
 */
export function formatCreateCommand(answers: Answers, shell: Shell): string {
  const create = CREATE_COMMANDS[answers.packageManager] ?? CREATE_COMMANDS['npm'];
  const head = `${create?.prefix ?? ''}${create?.separator ?? ''} --yes`;
  const flags = getExportableKeys(answers).map((key) => `--${key}=${quote(String(answers[key as keyof Answers]), shell)}`);

  if (shell === 'cmd') {
    // One long line. `cmd`'s `^` continuation is silently broken by a single trailing space, and a
    // Generated file is exactly where nobody would look for that.
    return [head, ...flags].join(' ');
  }

  return [head, ...flags].join(' \\\n  ');
}

/** A runnable script that regenerates this project non-interactively. */
export function formatCreateScript(answers: Answers, shell: Shell): string {
  const command = formatCreateCommand(answers, shell);
  if (shell === 'cmd') {
    // CRLF, because a batch file with bare LF endings misbehaves on older Windows shells.
    return ['@echo off', command, ''].join('\r\n');
  }
  return ['#!/usr/bin/env sh', 'set -e', '', command, ''].join('\n');
}

/**
 * The answers worth writing into a recipe: every answerable key, minus the ones demo pins.
 *
 * Under `preset: demo` the generator fixes `bundler` and `uiFramework` itself, so emitting them would
 * both misreport them as the user's choice and produce a command the CLI refuses -- it rejects that
 * pairing precisely so a flag cannot reach the combination T735-P42 closed. Omitting them keeps the
 * recipe reproducible, since re-running it lets demo pin them again.
 */
export function getExportableKeys(answers: Answers): string[] {
  const keys = getAnswerableKeys();
  if (answers.preset !== 'demo') {
    return keys;
  }
  return keys.filter((key) => !DEMO_PINNED_ANSWER_KEYS.includes(key));
}

/** The file extension an exported create-script takes on each shell. */
export function getScriptExtension(shell: Shell): string {
  return shell === 'cmd' ? '.cmd' : '.sh';
}

/** The shell to write a create-script for on this machine. */
export function getShellForPlatform(platform: string): Shell {
  return platform === 'win32' ? 'cmd' : 'sh';
}

/**
 * Quotes a value so the shell hands it to the generator unchanged.
 *
 * `sh` gets single quotes, inside which everything is literal; an embedded `'` ends the string, so it is
 * spliced back in as `'\''`. `cmd` gets double quotes, an embedded `"` is doubled -- and a literal `%`
 * MUST become `%%`, because a batch file expands `%…%` as a variable. `fundingUrl` hits that directly:
 * the fleet's funding and badge URLs are percent-encoded.
 */
function quote(value: string, shell: Shell): string {
  if (shell === 'cmd') {
    return `"${value.replaceAll('%', '%%').replaceAll('"', '""')}"`;
  }
  return `'${value.replaceAll('\'', '\'\\\'\'')}'`;
}
