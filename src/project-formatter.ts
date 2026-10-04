import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { needsInitialFormat } from './features/formatter/index.ts';

/**
 * The formatter a generated project installed, run the way its own `format` script runs it.
 *
 * The update needs it because the files a formatter rewrote match neither the hash the generator recorded nor
 * the new render, which is exactly what a hand edit looks like. Comparing against the render as the formatter
 * would write it, and formatting what the update writes, is what keeps the formatter's work from counting as
 * the user's.
 */
export interface ProjectFormatter {
  /**
   * The content as the project's formatter would write it at that path, or `null` when it would not format
   * it (a file type it does not know). An ignored path may come back formatted: this is only ever compared
   * against what is on disk, never written.
   */
  formatContent(destinationPath: string, content: string): null | string;

  /**
   * Formats files in place. Paths are passed explicitly, and both formatters still honour their own ignore
   * settings for an explicit path, so a demo-vault file stays byte for byte what was rendered.
   */
  formatFiles(destinationPaths: readonly string[]): void;
}

interface BinPackageJson {
  bin?: Record<string, string> | string;
}

interface FormatterCli {
  readonly checkArgs: (destinationPath: string) => string[];
  readonly packageName: string;
  readonly writeArgs: (destinationPaths: readonly string[]) => string[];
}

const FORMATTER_COMMANDS: Readonly<Record<string, FormatterCli>> = {
  biome: {
    checkArgs: (destinationPath) => ['format', `--stdin-file-path=${destinationPath}`],
    packageName: '@biomejs/biome',
    writeArgs: (destinationPaths) => ['format', '--write', '--no-errors-on-unmatched', ...destinationPaths]
  },
  prettier: {
    checkArgs: (destinationPath) => ['--stdin-filepath', destinationPath],
    packageName: 'prettier',
    writeArgs: (destinationPaths) => ['--write', '--ignore-unknown', ...destinationPaths]
  }
};

/**
 * The formatter for a project, or `null` when it chose none that rewrites the templates or has not installed it.
 *
 * Only the formatters {@link needsInitialFormat} names: the templates already pass dprint's check, so a dprint
 * project's files are byte for byte the render. The CLI is run through `node` from the package's own `bin`
 * entry rather than through `node_modules/.bin`, which is a `.cmd` shim on Windows.
 */
export function createProjectFormatter(targetDir: string, formatter: string): null | ProjectFormatter {
  const cli = FORMATTER_COMMANDS[formatter];
  if (!needsInitialFormat(formatter) || cli === undefined) {
    return null;
  }

  const binPath = resolveBin(targetDir, cli.packageName);
  if (binPath === null) {
    return null;
  }

  return {
    formatContent(destinationPath: string, content: string): null | string {
      return runCli(binPath, targetDir, cli.checkArgs(destinationPath), content);
    },
    formatFiles(destinationPaths: readonly string[]): void {
      if (destinationPaths.length > 0) {
        runCli(binPath, targetDir, cli.writeArgs(destinationPaths));
      }
    }
  };
}

function resolveBin(targetDir: string, packageName: string): null | string {
  const packageDir = join(targetDir, 'node_modules', packageName);
  const packageJsonPath = join(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const { bin } = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as BinPackageJson;
  const relativeBin = typeof bin === 'string' ? bin : Object.values(bin ?? {})[0];
  return relativeBin === undefined ? null : join(packageDir, relativeBin);
}

/** The CLI's stdout when it exits 0, otherwise `null`: a file type the formatter does not know, or a failure. */
function runCli(binPath: string, targetDir: string, args: readonly string[], input?: string): null | string {
  const result = spawnSync(process.execPath, [binPath, ...args], { cwd: targetDir, encoding: 'utf-8', input });
  return result.status === 0 ? result.stdout : null;
}
