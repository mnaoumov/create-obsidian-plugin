import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  dirname,
  join,
  posix,
  relative
} from 'node:path';
import process from 'node:process';
import {
  createProgram,
  isImportDeclaration,
  isStringLiteral,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget
} from 'typescript';

import type { DocsShowcaseReport } from '../src/docs-showcase/docs-showcase-files.ts';
import type {
  ShowcaseEntry,
  ShowcaseSource
} from '../src/docs-showcase/showcase-tree.ts';
import type { KnownModuleExports } from '../src/docs-showcase/wrap-snippet.ts';

import {
  DOCS_SHOWCASE_FILES_DIR,
  DOCS_SHOWCASE_HOST_DIR,
  DOCS_SHOWCASE_REPORT_PATH,
  DOCS_SHOWCASE_TREE_DIR,
  DOCS_SHOWCASE_UPSTREAM_NAME
} from '../src/docs-showcase/docs-showcase-files.ts';
import {
  DOCS_CONTENT_DIR,
  extractSnippets
} from '../src/docs-showcase/extract-snippets.ts';
import {
  buildIndexModule,
  buildReadme,
  buildShowcaseEntries
} from '../src/docs-showcase/showcase-tree.ts';
import { describeUpstreamLicense } from '../src/docs-showcase/upstream-license.ts';
import {
  getPackageRoot,
  getUpstreamsPath
} from '../src/official-sample.ts';
import { readUpstream } from '../src/upstream-snapshot.ts';
import { PINNED_VERSIONS } from '../src/versions.ts';

interface PackageManifest {
  readonly devDependencies: Record<string, string>;
}

interface TypeCheckError {
  readonly stdout?: string;
}

interface UpstreamEntry {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- The sync updates this upstream pin before writing upstreams.json.
  commit: string;
  readonly name: string;
}

interface UpstreamsFile {
  readonly upstreams: UpstreamEntry[];
}

const JSON_INDENT_SPACES = 2;

/** The packages a snippet's missing name is imported from, in priority order. */
const KNOWN_MODULES = ['obsidian', '@codemirror/view', '@codemirror/state', '@codemirror/language'];

/** A type check that keeps failing new files is a cascade through same-page imports; it settles well before this. */
const MAX_TYPE_CHECK_ROUNDS = 10;

const DIAGNOSTIC_PATTERN = /^(?<File>.+?)\((?<Line>\d+),(?<Column>\d+)\): error (?<Code>TS\d+): (?<Message>.*)$/;

main();

/**
 * Says why a module failed, in terms of the block rather than the wrapper: the first diagnostic, with its line
 * translated back to the block's, and a failure caused only by importing another failed block named as such.
 */
function describeFailure(entry: ShowcaseEntry, entries: readonly ShowcaseEntry[]): string {
  const first = entry.diagnostics[0] ?? 'the type check failed';
  const missingModule = /Cannot find module '(?<Specifier>\.\.?\/[^']+)'/.exec(first)?.groups?.['Specifier'];
  if (missingModule) {
    const missingFile = posix.join(posix.dirname(entry.file), missingModule);
    const provider = entries.find((candidate) => candidate.file === missingFile);
    if (provider) {
      return `it imports from the block at line ${String(provider.line)} of ${provider.page}, which does not compile`;
    }
  }
  return `\`${first.replace(/^\d+:\d+ /, '')}\`, ${locateInBlock(first, entry)}`;
}

function fetchCommit(repo: string, ref: string, dir: string): string {
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(dir, { recursive: true });
    git(dir, 'init', '--quiet');
    git(dir, 'remote', 'add', 'origin', `https://github.com/${repo}.git`);
  }
  git(dir, 'fetch', '--quiet', '--depth', '1', 'origin', ref);
  git(dir, 'checkout', '--quiet', '--force', 'FETCH_HEAD');
  return git(dir, 'rev-parse', 'HEAD').trim();
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

function installCheckPackages(dir: string, obsidianVersion: string): void {
  mkdirSync(dir, { recursive: true });
  const language = PINNED_VERSIONS['@codemirror/language']?.version ?? 'latest';
  const typescriptVersion = (JSON.parse(readFileSync(join(getPackageRoot(), 'package.json'), 'utf-8')) as PackageManifest).devDependencies['typescript'] ?? 'latest';
  writeFileSync(
    join(dir, 'package.json'),
    `${
      JSON.stringify(
        {
          dependencies: {
            '@codemirror/language': language,
            'obsidian': obsidianVersion,
            'typescript': typescriptVersion
          },
          name: 'docs-showcase-check',
          private: true,
          type: 'module'
        },
        null,
        JSON_INDENT_SPACES
      )
    }\n`
  );
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: dir, shell: true, stdio: 'inherit' });
}

/** Translates a diagnostic's line in the wrapped module back to the block, and to the docs page. */
function locateInBlock(diagnostic: string, entry: ShowcaseEntry): string {
  const moduleLine = Number(/^(?<Line>\d+):/.exec(diagnostic)?.groups?.['Line'] ?? 0);
  const codeLines = entry.code.split('\n');
  const firstCodeIndex = codeLines.findIndex((line) => line.trim() !== '');
  const firstCodeLine = codeLines[firstCodeIndex]?.trim() ?? '';
  const moduleLines = entry.module.split('\n');
  const headerEnd = moduleLines.indexOf('');
  const blockStart = moduleLines.findIndex((line, index) => index > headerEnd && line.trim() === firstCodeLine);
  const blockLine = moduleLine - blockStart + firstCodeIndex;
  if (blockStart === -1 || blockLine < 1 || blockLine > codeLines.length) {
    return 'in the code generated around the block';
  }
  // The fence is the page's line `entry.line`, so the block's first line is the one after it.
  return `at line ${String(blockLine)} of the block (line ${String(entry.line + blockLine)} of the page)`;
}

/**
 * Regenerates the Developer docs showcase from obsidianmd/obsidian-developer-docs.
 *
 * Reads every page under `en/`, extracts each fenced code block, classifies and wraps it, type-checks the wrapped
 * modules against the `obsidian` API under the official sample plugin's compiler options, and writes the modules that
 * compile into `templates/docs-showcase/files` and the fate of every block into `templates/docs-showcase/snippets.json`.
 *
 * It is the `upstreams.json` entry's `handler`, so the upstream-sync job runs it when the docs move. By default it
 * reads the docs at the tracked branch and type-checks against the latest `obsidian`. `--check` re-runs the pinned
 * commit against the pinned `obsidian` version, writes nothing, and exits 1 when the result differs from what is
 * committed, or when upstream has moved past the pin. `--pinned-docs` regenerates from the pinned commit against the
 * latest `obsidian`, which is what the `obsidian` entry's handler runs when a new `obsidian` is released, so that PR
 * carries the API change alone and leaves the docs to their own entry.
 */
function main(): void {
  const isCheck = process.argv.includes('--check');
  const isPinnedDocs = process.argv.includes('--pinned-docs');
  const packageRoot = getPackageRoot();
  const upstreamsPath = getUpstreamsPath();
  const upstream = readUpstream(upstreamsPath, DOCS_SHOWCASE_UPSTREAM_NAME);
  const reportPath = join(packageRoot, DOCS_SHOWCASE_REPORT_PATH);
  const committedReport = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf-8')) as DocsShowcaseReport : null;

  const workDir = mkdtempSync(join(tmpdir(), 'docs-showcase-'));
  try {
    const docsDir = join(workDir, 'docs');
    const headCommit = fetchCommit(upstream.repo, upstream.ref, docsDir);
    const commit = isCheck || isPinnedDocs ? upstream.commit : headCommit;
    if (commit !== headCommit) {
      fetchCommit(upstream.repo, upstream.commit, docsDir);
    }

    const obsidianVersion = isCheck && committedReport ? committedReport.obsidianVersion : resolveLatestVersion('obsidian');
    const checkDir = join(workDir, 'check');
    installCheckPackages(checkDir, obsidianVersion);

    const source: ShowcaseSource = {
      commit,
      license: readLicense(docsDir, upstream.repo),
      repo: upstream.repo
    };
    const pages = readPages(join(docsDir, DOCS_CONTENT_DIR));
    const knownModules = readKnownModules(checkDir);
    const entries = buildShowcaseEntries(extractSnippets(pages), knownModules, source);

    const treeDir = join(checkDir, 'src', 'docs');
    cpSync(join(packageRoot, DOCS_SHOWCASE_HOST_DIR), treeDir, { recursive: true });
    for (const entry of entries) {
      if (entry.status === 'runnable') {
        writeFile(join(treeDir, entry.file), entry.module);
      }
    }

    removeFailingEntries(checkDir, treeDir, entries);

    writeFile(join(treeDir, 'index.ts'), buildIndexModule(entries));
    writeFile(join(treeDir, 'README.md'), buildReadme(entries, source));
    const finalFailures = typeCheck(checkDir);
    if (finalFailures.size > 0) {
      throw new Error(`The generated showcase does not compile: ${JSON.stringify(Object.fromEntries(finalFailures))}`);
    }

    const report: DocsShowcaseReport = {
      commit,
      entries: entries.map(({ code: _code, module: _module, ...entry }) => entry),
      obsidianVersion,
      repo: upstream.repo
    };
    const generatedFiles = readTree(treeDir);
    const filesDir = join(packageRoot, DOCS_SHOWCASE_FILES_DIR);
    const committedFiles = readTree(join(filesDir, DOCS_SHOWCASE_TREE_DIR));
    const reportText = `${JSON.stringify(report, null, JSON_INDENT_SPACES)}\n`;

    const changed = [...generatedFiles].filter(([path, content]) => committedFiles.get(path) !== content).map(([path]) => path);
    const removed = [...committedFiles.keys()].filter((path) => !generatedFiles.has(path));
    const isReportCurrent = existsSync(reportPath) && readFileSync(reportPath, 'utf-8') === reportText;
    printSummary(report);

    if (isCheck) {
      const isPinCurrent = headCommit === upstream.commit;
      if (changed.length === 0 && removed.length === 0 && isReportCurrent && isPinCurrent) {
        process.stdout.write(`The showcase matches ${upstream.repo}@${commit} and obsidian ${obsidianVersion}.\n`);
        return;
      }
      if (!isPinCurrent) {
        process.stdout.write(`${upstream.repo}@${upstream.ref} moved: pinned ${upstream.commit}, upstream ${headCommit}.\n`);
      }
      reportSnapshotChanges(changed, removed, isReportCurrent, committedFiles);
      process.exitCode = 1;
      return;
    }

    rmSync(filesDir, { force: true, recursive: true });
    for (const [path, content] of generatedFiles) {
      writeFile(join(filesDir, DOCS_SHOWCASE_TREE_DIR, path), content);
    }
    writeFileSync(reportPath, reportText);

    const upstreams = JSON.parse(readFileSync(upstreamsPath, 'utf-8')) as UpstreamsFile;
    for (const entry of upstreams.upstreams) {
      if (entry.name === DOCS_SHOWCASE_UPSTREAM_NAME) {
        entry.commit = commit;
      }
    }
    writeFileSync(upstreamsPath, `${JSON.stringify(upstreams, null, JSON_INDENT_SPACES)}\n`);
    process.stdout.write(`Regenerated the showcase from ${upstream.repo}@${commit} against obsidian ${obsidianVersion}: ${String(changed.length)} file(s) changed, ${String(removed.length)} removed.\n`);
  } finally {
    rmSync(workDir, { force: true, recursive: true });
  }
}

function printSummary(report: DocsShowcaseReport): void {
  const counts = new Map<string, number>();
  for (const entry of report.entries) {
    counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  }
  process.stdout.write(`${String(report.entries.length)} code blocks: ${[...counts].map(([status, count]) => `${String(count)} ${status}`).join(', ')}.\n`);
}

function readKnownModules(checkDir: string): KnownModuleExports {
  const probePath = join(checkDir, 'probe.ts');
  writeFileSync(probePath, KNOWN_MODULES.map((name, index) => `import * as m${String(index)} from '${name}';\nexport { m${String(index)} };`).join('\n'));
  const program = createProgram([probePath], {
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ScriptTarget.ES2021,
    types: []
  });
  const checker = program.getTypeChecker();
  const probe = program.getSourceFile(probePath);
  const known = new Map<string, ReadonlySet<string>>();
  for (const statement of probe?.statements ?? []) {
    if (!isImportDeclaration(statement) || !isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const $symbol = checker.getSymbolAtLocation(statement.moduleSpecifier);
    known.set(statement.moduleSpecifier.text, new Set($symbol ? checker.getExportsOfModule($symbol).map((exported) => exported.name) : []));
  }
  rmSync(probePath);
  return known;
}

function readLicense(docsDir: string, repo: string): string {
  const licensePath = join(docsDir, 'LICENSE');
  if (!existsSync(licensePath)) {
    return '';
  }
  return describeUpstreamLicense(readFileSync(licensePath, 'utf-8'), repo);
}

function readPages(contentDir: string): Map<string, string> {
  const pages = new Map<string, string>();
  for (const entry of readdirSync(contentDir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const fullPath = join(entry.parentPath, entry.name);
      pages.set(relative(contentDir, fullPath).replaceAll('\\', '/'), readFileSync(fullPath, 'utf-8'));
    }
  }
  return pages;
}

function readTree(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(dir)) {
    return files;
  }
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const fullPath = join(entry.parentPath, entry.name);
      files.set(relative(dir, fullPath).replaceAll('\\', '/'), readFileSync(fullPath, 'utf-8'));
    }
  }
  return new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
}

function removeFailingEntries(checkDir: string, treeDir: string, entries: readonly ShowcaseEntry[]): void {
  for (let round = 0; round < MAX_TYPE_CHECK_ROUNDS; round++) {
    const failures = typeCheck(checkDir);
    if (failures.size === 0) {
      break;
    }
    for (const entry of entries) {
      const diagnostics = failures.get(entry.file);
      if (entry.status !== 'runnable' || !diagnostics) {
        continue;
      }
      entry.status = 'type-error';
      entry.diagnostics = diagnostics;
      entry.reason = describeFailure(entry, entries);
      rmSync(join(treeDir, entry.file));
    }
    const hostFailure = [...failures.keys()].find((file) => !entries.some((entry) => entry.file === file));
    if (hostFailure !== undefined) {
      throw new Error(`The showcase's own ${hostFailure} does not compile: ${(failures.get(hostFailure) ?? []).join('; ')}`);
    }
  }
}

function reportSnapshotChanges(changed: readonly string[], removed: readonly string[], isReportCurrent: boolean, committedFiles: ReadonlyMap<string, string>): void {
  for (const path of changed) {
    process.stdout.write(`  ${committedFiles.has(path) ? 'changed' : 'added'}: ${path}\n`);
  }
  for (const path of removed) {
    process.stdout.write(`  removed: ${path}\n`);
  }
  if (!isReportCurrent) {
    process.stdout.write(`  changed: ${DOCS_SHOWCASE_REPORT_PATH}\n`);
  }
  process.stdout.write('Run `npm run sync:docs-showcase` to regenerate the showcase.\n');
}

function resolveLatestVersion(packageName: string): string {
  return execFileSync('npm', ['view', packageName, 'version'], { encoding: 'utf-8', shell: true }).trim();
}

/** Runs `tsc` over the showcase folder and groups its errors by module, relative to the folder. */
function typeCheck(checkDir: string): Map<string, string[]> {
  const treeDir = join(checkDir, 'src', 'docs');
  let output = '';
  try {
    execFileSync(process.execPath, [join(checkDir, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(treeDir, 'tsconfig.json'), '--pretty', 'false'], {
      cwd: checkDir,
      encoding: 'utf-8'
    });
  } catch (error) {
    output = (error as TypeCheckError).stdout ?? '';
  }

  const failures = new Map<string, string[]>();
  for (const line of output.split(/\r?\n/)) {
    const groups = DIAGNOSTIC_PATTERN.exec(line)?.groups;
    if (!groups) {
      continue;
    }
    const file = relative(treeDir, join(checkDir, groups['File'] ?? '')).replaceAll('\\', '/');
    failures.set(file, [...failures.get(file) ?? [], `${groups['Line'] ?? ''}:${groups['Column'] ?? ''} ${groups['Code'] ?? ''}: ${groups['Message'] ?? ''}`]);
  }
  return failures;
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
