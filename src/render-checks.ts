import type {
  Diagnostic,
  ImportDeclaration,
  Node,
  SourceFile
} from 'typescript';

import {
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';
import {
  canHaveModifiers,
  createSourceFile,
  flattenDiagnosticMessageText,
  forEachChild,
  getModifiers,
  isBlock,
  isClassDeclaration,
  isExportDeclaration,
  isFunctionDeclaration,
  isFunctionLike,
  isIdentifier,
  isImportDeclaration,
  isNamedImports,
  isNamespaceImport,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  isVariableStatement,
  parseJsonText,
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
  | 'duplicate-declaration'
  | 'duplicate-json-key'
  | 'empty-block'
  | 'empty-file'
  | 'invalid-json'
  | 'invalid-typescript'
  | 'invalid-yaml'
  | 'placeholder-leaked'
  | 'render-threw'
  | 'script-file-missing'
  | 'script-mismatch'
  | 'undeclared-dependency'
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

/** `@scope/name` — the two path segments a scoped package's name occupies in an import specifier. */
const SCOPED_PACKAGE_SEGMENTS = 2;

/** Checks an already-rendered project directory against the answers that produced it. */
export function checkRenderedProject(targetDir: string, answers: Answers): RenderViolation[] {
  const violations: RenderViolation[] = [];

  for (const relativePath of walk(targetDir, '')) {
    violations.push(...checkFile(targetDir, relativePath));
  }

  violations.push(...checkPackageJsonScripts(targetDir, answers));
  violations.push(...checkDeclaredDependencies(targetDir, answers));
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

/**
 * Every package an emitted file imports must be one the project actually declares.
 *
 * npm hoists, so a package that is only a transitive peer sits in the root `node_modules` and resolves
 * exactly like a declared one -- and the project works, on npm, by accident. pnpm's strict layout does
 * not hoist, and the accident stops. That is how the ESLint answer ran for its whole life without ever
 * declaring `eslint`: `eslint.config.mts` imports `eslint/config` and `scripts/lint.ts` runs the binary,
 * both satisfied by typescript-eslint's peer copy under npm and by nothing at all under pnpm.
 *
 * Static, so it does not need an install -- which matters because the install tier reaches pnpm in
 * exactly one of its 56 cases, and that case is the slowest feedback in the project.
 */
function checkDeclaredDependencies(targetDir: string, answers: Answers): RenderViolation[] {
  const declared = new Set(buildTemplate(answers).dependencies.map((dependency) => dependency.packageName));
  const violations: RenderViolation[] = [];

  for (const relativePath of walk(targetDir, '')) {
    const fileName = relativePath.split('/').pop() ?? '';
    if (!TYPESCRIPT_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
      continue;
    }

    const content = readFileSync(join(targetDir, relativePath), 'utf-8');
    const source = createSourceFile(fileName, content, ScriptTarget.ESNext, true, scriptKindFor(fileName));
    for (const packageName of new Set(importedPackages(source))) {
      if (!declared.has(packageName)) {
        violations.push({
          detail: `Imports "${packageName}", which the project does not declare. npm hoists a transitive copy into place and hides this; pnpm does not.`,
          kind: 'undeclared-dependency',
          subject: relativePath
        });
      }
    }
  }

  return violations;
}

/**
 * Keys an emitted JSON file sets more than once in the same object.
 *
 * The JSON twin of {@link checkTopLevelDuplicates}, and the same failure: two partials that are not
 * really per-answer both writing the same line. `JSON.parse` accepts a duplicate key SILENTLY and keeps
 * the last one, so `invalid-json` cannot see it -- which is how a `tsconfig.json` composed from two
 * frameworks' `compiler-options` partials (`"jsx": "preserve"` from solid, then `"jsx": "react-jsx"`
 * forced in by the demo preset) parsed clean while the project it describes could not compile, and only
 * the hour-long install tier reported it.
 *
 * Never a deliberate duplicate: a JSON object holds one value per key by definition.
 */
function checkDuplicateJsonKeys(relativePath: string, fileName: string, content: string): RenderViolation[] {
  const duplicated = new Set<string>();

  function visit(node: Node): void {
    if (isObjectLiteralExpression(node)) {
      const seen = new Set<string>();
      for (const property of node.properties) {
        if (!isPropertyAssignment(property) || !isStringLiteral(property.name)) {
          continue;
        }
        if (seen.has(property.name.text)) {
          duplicated.add(property.name.text);
        }
        seen.add(property.name.text);
      }
    }
    forEachChild(node, visit);
  }

  visit(parseJsonText(fileName, content));

  return [...duplicated].map((name) => ({
    detail: `"${name}" is set more than once in the same object. \`JSON.parse\` keeps the last one without complaining, so two partials each writing the key leave the file valid and wrong.`,
    kind: 'duplicate-json-key' as const,
    subject: relativePath
  }));
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
  violations.push(...checkTopLevelDuplicates(relativePath, source));
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
    return checkDuplicateJsonKeys(relativePath, fileName, content);
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
 * Names declared more than once at the top level of an emitted file.
 *
 * The signature failure of a per-answer partial that is not actually per-answer. Five styling partials
 * each emitted `import MiniCssExtractPlugin …` and three UI-framework partials each emitted
 * `import babelModule …` plus its `const babel = …`; the moment a preset forces a second answer in the
 * same question -- which `demo` does for both styling and uiFramework -- the file carried the line
 * twice and failed to compile with TS2300 / TS2451. The fix in each case is one partial named for what
 * it is, contributed by every answer that needs it: `partials` is a Set, so it renders once.
 *
 * Deliberately narrow. Interfaces and type aliases merge legally, function overloads declare the same
 * name on purpose, and `declare module` blocks repeat by design -- none of them is counted.
 */
function checkTopLevelDuplicates(relativePath: string, source: SourceFile): RenderViolation[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();

  function record(name: string): void {
    if (seen.has(name)) {
      duplicated.add(name);
    }
    seen.add(name);
  }

  for (const statement of source.statements) {
    if (isImportDeclaration(statement)) {
      for (const name of importedNames(statement)) {
        record(name);
      }
    } else if (isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (isIdentifier(declaration.name)) {
          record(declaration.name.text);
        }
      }
    } else if (isClassDeclaration(statement) && statement.name) {
      record(statement.name.text);
    } else if (isFunctionDeclaration(statement) && statement.name && statement.body) {
      record(statement.name.text);
    }
  }

  return [...duplicated].map((name) => ({
    detail: `"${name}" is declared more than once at the top level. Two partials emitted the same line -- name one partial for what it is and have every answer that needs it contribute that.`,
    kind: 'duplicate-declaration' as const,
    subject: relativePath
  }));
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

/** Every local name an import declaration introduces: default, namespace and each named binding. */
function importedNames(statement: ImportDeclaration): string[] {
  const clause = statement.importClause;
  if (!clause) {
    return [];
  }

  const names: string[] = [];
  if (clause.name) {
    names.push(clause.name.text);
  }

  const bindings = clause.namedBindings;
  if (bindings && isNamespaceImport(bindings)) {
    names.push(bindings.name.text);
  } else if (bindings && isNamedImports(bindings)) {
    for (const element of bindings.elements) {
      names.push(element.name.text);
    }
  }

  return names;
}

/**
 * The bare package names a source file imports, ignoring everything that is not a package.
 *
 * Relative and absolute specifiers are the file's own tree. Node builtins are the runtime's, with or
 * without the `node:` prefix. Everything else is a package, and its name is the first path segment --
 * two for a scoped one, so `obsidian-dev-utils/script-utils/version` and `@codemirror/state/dist` both
 * reduce to what `package.json` would have to declare.
 */
function importedPackages(source: SourceFile): string[] {
  const names: string[] = [];

  for (const statement of source.statements) {
    let specifier: string | undefined;
    if (isImportDeclaration(statement) && isStringLiteral(statement.moduleSpecifier)) {
      specifier = statement.moduleSpecifier.text;
    } else if (isExportDeclaration(statement) && statement.moduleSpecifier && isStringLiteral(statement.moduleSpecifier)) {
      specifier = statement.moduleSpecifier.text;
    }

    if (specifier === undefined || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:') || builtinModules.includes(specifier)) {
      continue;
    }

    const segments = specifier.split('/');
    names.push(specifier.startsWith('@') ? segments.slice(0, SCOPED_PACKAGE_SEGMENTS).join('/') : segments[0] ?? specifier);
  }

  return names;
}

function scriptKindFor(fileName: string): ScriptKind {
  return fileName.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS;
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
