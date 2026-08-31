import type {
  Diagnostic,
  Node,
  SourceFile
} from 'typescript';

import {
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import { join } from 'node:path';
import {
  canHaveModifiers,
  createSourceFile,
  flattenDiagnosticMessageText,
  forEachChild,
  getModifiers,
  isBlock,
  isFunctionLike,
  ScriptKind,
  ScriptTarget,
  SyntaxKind
} from 'typescript';
import { parse as parseYaml } from 'yaml';

import type { Answers } from './answers.ts';

import { describeCase } from './answer-space.ts';
import {
  buildTemplate,
  copyTemplates
} from './templates.ts';

/** What a rendering check found in one emitted project. */
export interface RenderViolation {
  detail: string;
  kind: RenderViolationKind;
  /** Path relative to the emitted project, or the case description when the render itself failed. */
  subject: string;
}

/**
 * The distinct ways a rendered project can be wrong while still looking generated.
 *
 * `empty-file` is the one that justifies the tier. An unresolved partial renders as `''` rather than
 * failing, so the destination is written empty -- and an empty `.ts` compiles, an empty config is read as
 * "no configuration", and every existence check passes.
 */
export type RenderViolationKind =
  | 'await-outside-async'
  | 'empty-block'
  | 'empty-file'
  | 'invalid-json'
  | 'invalid-typescript'
  | 'invalid-yaml'
  | 'placeholder-leaked'
  | 'render-threw'
  | 'script-file-missing'
  | 'script-mismatch'
  | 'unrendered-ejs';

interface PackageJsonScripts {
  scripts?: Record<string, string>;
}

/**
 * A parsed source file plus the syntax errors the parse produced.
 *
 * `parseDiagnostics` is not on the public `SourceFile` type, but it is the only list of syntax errors a
 * standalone parse yields -- the public routes (`getPreEmitDiagnostics`, `transpileModule`) both want a
 * Program or an emit, which this tier has no use for. It installs nothing, so there are no `obsidian` or
 * framework types to resolve against: syntax is the whole question here.
 */
interface ParsedSourceFile extends SourceFile {
  parseDiagnostics?: readonly Diagnostic[];
}

/** Extensions parsed as TypeScript. `.mts` is here for the emitted `eslint.config.mts`. */
const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

const JSON_EXTENSIONS = ['.json'];

const YAML_EXTENSIONS = ['.yml', '.yaml'];

/**
 * Files exempt from the non-empty check.
 *
 * `.gitkeep` exists precisely to be empty. Nothing else is: a zero-byte emitted file is the signature of
 * a partial that did not resolve.
 */
const MAY_BE_EMPTY = new Set(['.gitkeep']);

/** How much of a parse error to quote. Enough to locate it, short enough to read in a sweep report. */
const DETAIL_LENGTH = 200;

/** Characters of context on each side of a leaked placeholder, so the excerpt shows what surrounds it. */
const EXCERPT_RADIUS = 100;

/** Checks an already-rendered project directory against the answers that produced it. */
export function checkRenderedProject(targetDir: string, answers: Answers): RenderViolation[] {
  const violations: RenderViolation[] = [];

  for (const relativePath of walk(targetDir, '')) {
    violations.push(...checkFile(targetDir, relativePath));
  }

  violations.push(...checkPackageJsonScripts(targetDir, answers));
  return violations;
}

/**
 * Renders one case into `targetDir` and checks everything the rendered bytes can be checked for.
 *
 * The render is inside the check for the same reason the plan build is: `copyTemplates` can throw, and a
 * sweep that dies on the first such case reports one defect rather than all of them.
 */
export function renderAndCheck(answers: Answers, targetDir: string): RenderViolation[] {
  try {
    copyTemplates(answers, targetDir, '0.0.0', null);
  } catch (error: unknown) {
    return [{
      detail: error instanceof Error ? error.message : String(error),
      kind: 'render-threw',
      subject: describeCase(answers)
    }];
  }

  return checkRenderedProject(targetDir, answers);
}

function checkFile(targetDir: string, relativePath: string): RenderViolation[] {
  const violations: RenderViolation[] = [];
  const content = readFileSync(join(targetDir, relativePath), 'utf-8');
  const fileName = relativePath.split('/').pop() ?? '';

  if (content.trim() === '' && !MAY_BE_EMPTY.has(fileName)) {
    violations.push({
      detail: 'Emitted empty. An unresolved partial renders as an empty string rather than failing.',
      kind: 'empty-file',
      subject: relativePath
    });
    // Everything below would only restate this, and an empty file parses as valid YAML.
    return violations;
  }

  if (content.includes('<%')) {
    violations.push({
      detail: `Unrendered EJS tag: ${excerptAround(content, '<%')}`,
      kind: 'unrendered-ejs',
      subject: relativePath
    });
  }

  // `[object Object]` is never intentional -- it is a template interpolating a value it should have
  // Reached into. `undefined` is deliberately NOT matched here: it is legal TypeScript, and the JSON
  // Walk below catches the case that actually matters.
  if (content.includes('[object Object]')) {
    violations.push({
      detail: `An object was interpolated where a value was meant: ${excerptAround(content, '[object Object]')}`,
      kind: 'placeholder-leaked',
      subject: relativePath
    });
  }

  violations.push(...checkSyntax(relativePath, fileName, content));
  return violations;
}

/**
 * Checks the emitted `package.json` scripts against the plan, and that each named script file exists.
 *
 * The plan-level tier checks the same script names against *registered* files; this checks them against
 * files that were actually written, which is the half that catches a registered file whose render was
 * skipped.
 */
function checkPackageJsonScripts(targetDir: string, answers: Answers): RenderViolation[] {
  const violations: RenderViolation[] = [];
  let parsed: PackageJsonScripts;

  try {
    parsed = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as PackageJsonScripts;
  } catch {
    // Already reported as `invalid-json` by the per-file pass.
    return violations;
  }

  const emitted = parsed.scripts ?? {};
  const planned = buildTemplate(answers).scripts;

  for (const [name, command] of Object.entries(planned)) {
    if (emitted[name] !== command) {
      violations.push({
        detail: `The plan registers "${name}" as "${command}", the emitted package.json has "${String(emitted[name])}".`,
        kind: 'script-mismatch',
        subject: `package.json scripts.${name}`
      });
    }
  }

  for (const [name, command] of Object.entries(emitted)) {
    const scriptPath = /^jiti (?<Path>scripts\/[\w.-]+\.ts)$/.exec(command)?.groups?.['Path'];
    if (scriptPath !== undefined && !existsRelative(targetDir, scriptPath)) {
      violations.push({
        detail: `Script "${name}" runs "${command}", but that file was not emitted.`,
        kind: 'script-file-missing',
        subject: scriptPath
      });
    }
  }

  return violations;
}

function checkSyntax(relativePath: string, fileName: string, content: string): RenderViolation[] {
  if (JSON_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
    try {
      JSON.parse(content);
    } catch (error: unknown) {
      return [{
        detail: error instanceof Error ? error.message.slice(0, DETAIL_LENGTH) : String(error),
        kind: 'invalid-json',
        subject: relativePath
      }];
    }
    return [];
  }

  if (YAML_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
    try {
      parseYaml(content);
    } catch (error: unknown) {
      return [{
        detail: error instanceof Error ? error.message.slice(0, DETAIL_LENGTH) : String(error),
        kind: 'invalid-yaml',
        subject: relativePath
      }];
    }
    return [];
  }

  if (!TYPESCRIPT_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
    return [];
  }

  // A parse, not a type-check: this tier installs nothing, so no `obsidian` or framework types exist to
  // Resolve against. Syntax is still worth asserting -- concatenating partials is exactly how a file
  // Ends up with a duplicated import block or an unbalanced brace.
  const source = createSourceFile(fileName, content, ScriptTarget.ESNext, true, scriptKindFor(fileName));
  const diagnostics = (source as ParsedSourceFile).parseDiagnostics ?? [];
  if (diagnostics.length === 0) {
    return checkStructure(relativePath, source);
  }

  const first = diagnostics[0];
  return [{
    detail: `${flattenDiagnosticMessageText(first?.messageText, ' ').slice(0, DETAIL_LENGTH)} (and ${String(diagnostics.length - 1)} more)`,
    kind: 'invalid-typescript',
    subject: relativePath
  }];
}

/**
 * Two defects a clean parse does not catch, both of which composition produces.
 *
 * A partial does not know what it is being rendered into. `await import(…)` reads fine on its own and
 * parses fine in the file, but the CLI-bundler build script drops it inside a synchronous function --
 * TS1308, and a hard `ParseError: Unexpected reserved word 'await'` from the bundler. An empty block is
 * the other half of the same thing: a wrapper that renders `if (prod) { <partial> }` emits `if (prod) {
 * }` on every answer contributing no partial, which the generated ESLint config rejects with `no-empty`.
 * Neither is a syntax error, so the parse pass above sees nothing.
 */
function checkStructure(relativePath: string, source: SourceFile): RenderViolation[] {
  const violations: RenderViolation[] = [];

  walkStructure(source, source, true, violations, relativePath);
  return violations;
}

function excerptAround(content: string, needle: string): string {
  const at = content.indexOf(needle);
  return JSON.stringify(content.slice(Math.max(0, at - EXCERPT_RADIUS), at + EXCERPT_RADIUS));
}

function existsRelative(targetDir: string, relativePath: string): boolean {
  try {
    statSync(join(targetDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function scriptKindFor(fileName: string): ScriptKind {
  return fileName.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS;
}

/**
 * Recurses one node, carrying whether `await` is legal where we are.
 *
 * Legal at the top level of a module and inside an `async` function; illegal inside a synchronous one.
 * Crossing into any function-like node therefore replaces the flag rather than inheriting it.
 */
function walkStructure(
  node: Node,
  source: SourceFile,
  awaitAllowed: boolean,
  violations: RenderViolation[],
  relativePath: string
): void {
  if (node.kind === SyntaxKind.AwaitExpression && !awaitAllowed) {
    violations.push({
      detail: `\`await\` inside a synchronous function: ${JSON.stringify(node.getText(source).slice(0, DETAIL_LENGTH))}`,
      kind: 'await-outside-async',
      subject: relativePath
    });
  }

  // A function body is deliberately exempt: an empty one is legal and sometimes meant (ESLint splits
  // These into `no-empty` and `no-empty-function` for the same reason). A block holding only a comment
  // Is exempt too -- `no-empty` ignores those, and the emitted `catch` blocks rely on it.
  if (isBlock(node) && node.statements.length === 0 && !isFunctionLike(node.parent)) {
    const inner = source.text.slice(node.getStart(source) + 1, node.getEnd() - 1);
    if (inner.trim() === '') {
      violations.push({
        detail: 'Empty block statement. A wrapper rendered a section that contributed nothing.',
        kind: 'empty-block',
        subject: relativePath
      });
    }
  }

  const childAwaitAllowed = isFunctionLike(node)
    ? (canHaveModifiers(node) ? getModifiers(node) : undefined)?.some((modifier) => modifier.kind === SyntaxKind.AsyncKeyword) ?? false
    : awaitAllowed;

  forEachChild(node, (child) => {
    walkStructure(child, source, childAwaitAllowed, violations, relativePath);
  });
}

function walk(targetDir: string, relativeDir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(targetDir, relativeDir))) {
    const relativePath = relativeDir === '' ? entry : `${relativeDir}/${entry}`;
    if (statSync(join(targetDir, relativePath)).isDirectory()) {
      found.push(...walk(targetDir, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found;
}
