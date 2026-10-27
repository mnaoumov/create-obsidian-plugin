import type {
  BindingName,
  ClassDeclaration,
  DiagnosticWithLocation,
  Expression,
  Identifier,
  Node,
  ParameterDeclaration,
  SourceFile,
  Statement
} from 'typescript';

import {
  canHaveModifiers,
  createSourceFile,
  flattenDiagnosticMessageText,
  forEachChild,
  getModifiers,
  isBindingElement,
  isBreakOrContinueStatement,
  isCallExpression,
  isClassDeclaration,
  isClassExpression,
  isConstructorDeclaration,
  isEnumDeclaration,
  isEnumMember,
  isExportSpecifier,
  isExpressionStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isFunctionTypeNode,
  isGetAccessor,
  isIdentifier,
  isImportClause,
  isImportDeclaration,
  isImportSpecifier,
  isInterfaceDeclaration,
  isJsxAttribute,
  isLabeledStatement,
  isMethodDeclaration,
  isMethodSignature,
  isNamedImports,
  isNamespaceImport,
  isObjectLiteralExpression,
  isOmittedExpression,
  isParameter,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isPropertyDeclaration,
  isPropertySignature,
  isQualifiedName,
  isSetAccessor,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeParameterDeclaration,
  isTypeReferenceNode,
  isVariableDeclaration,
  isVariableStatement,
  ScriptKind,
  ScriptTarget,
  SyntaxKind
} from 'typescript';

import type { DocsSnippet } from './extract-snippets.ts';

/** The modules a missing name can be imported from, in priority order, each with the names it exports. */
export type KnownModuleExports = ReadonlyMap<string, ReadonlySet<string>>;

/** Another snippet on the same page, whose exported names a later snippet may take. */
export interface PageModule {
  readonly exports: readonly string[];
  /** The module's specifier relative to the importing module: `./01-vault.ts`. */
  readonly specifier: string;
}

/**
 * What a snippet is, which decides the host it is wrapped in.
 *
 * - `plugin-class`: a module declaring a `Plugin` subclass. The host loads that class as a child plugin.
 * - `members`: class members on their own (`onload() { ... }`). The host puts them in a `Plugin` subclass, or a
 *   `PluginSettingTab` subclass when they are a settings tab's members, and loads that.
 * - `statements`: code that runs (`this.app.vault.getMarkdownFiles()`). The host runs it with `this` bound to a
 *   child plugin and the names the docs leave implicit (`app`, `file`, `editor`, ...) supplied.
 * - `expression`: a value on its own (`{ name: 'Volume', control: { ... } }`). The host evaluates and shows it.
 * - `declarations`: classes, functions and constants and nothing that runs. The host opens a modal, a view or a
 *   settings tab the module declares, registers an editor extension, or calls a function whose arguments it can
 *   supply.
 * - `css`: a stylesheet. The host toggles it on and off.
 * - `not-runnable`: everything else, with the reason.
 */
export type SnippetKind = 'css' | 'declarations' | 'expression' | 'members' | 'not-runnable' | 'plugin-class' | 'statements';

/** A snippet, classified and, when runnable, wrapped into the module the generated plugin compiles. */
export interface WrappedSnippet {
  /** The names the module exports, for the same-page imports of the snippets after it. */
  readonly exports: readonly string[];
  readonly kind: SnippetKind;
  /** The module's TypeScript source. Empty when the snippet is not runnable. */
  readonly module: string;
  /** Why the snippet is not runnable. Empty when it is. */
  readonly reason: string;
}

/** The names a statements or expression snippet uses without declaring, and how the host supplies each. */
const CONTEXT_BINDINGS: Readonly<Record<string, string>> = {
  app: 'context.app',
  containerEl: 'context.getContainerEl()',
  editor: 'await context.getEditor()',
  editorView: 'await context.getEditorView()',
  el: 'context.getContainerEl()',
  element: 'context.getContainerEl()',
  file: 'await context.getFile()',
  leaf: 'context.getLeaf()',
  leaves: '[context.getLeaf()]',
  plugin: 'context.plugin',
  vault: 'context.app.vault',
  workspace: 'context.app.workspace'
};

/** How the host supplies a function or constructor parameter, by the parameter's declared type. */
const ARGUMENTS_BY_TYPE: Readonly<Record<string, string>> = {
  App: 'context.app',
  boolean: 'true',
  Editor: 'await context.getEditor()',
  EditorView: 'await context.getEditorView()',
  HTMLElement: 'context.getContainerEl()',
  MarkdownView: 'await context.getMarkdownView()',
  number: '1',
  Plugin: 'context.plugin',
  string: '\'Hello, world\'',
  TFile: 'await context.getFile()',
  Vault: 'context.app.vault',
  Workspace: 'context.app.workspace',
  WorkspaceLeaf: 'context.getLeaf()'
};

/** Members that mark a class-members fragment as a settings tab's rather than a plugin's. */
const SETTING_TAB_MEMBERS: ReadonlySet<string> = new Set(['display', 'getControlValue', 'getSettingDefinitions', 'hide', 'setControlValue']);

/** Keys that mark an object literal as a declarative setting definition. */
const SETTING_DEFINITION_KEYS: ReadonlySet<string> = new Set(['action', 'control', 'render']);

const SETTING_DEFINITION_TYPES: ReadonlySet<string> = new Set(['group', 'list', 'page']);

const MODAL_BASES: ReadonlySet<string> = new Set(['FuzzySuggestModal', 'Modal', 'SuggestModal']);

const VIEW_BASES: ReadonlySet<string> = new Set(['FileView', 'ItemView', 'MarkdownView', 'TextFileView', 'View']);

const EDITOR_EXTENSION_FACTORIES: ReadonlySet<string> = new Set(['StateField.define', 'ViewPlugin.define', 'ViewPlugin.fromClass']);

/** The specifier wrapped modules import the host from; the caller rewrites it to the module's real relative path. */
export const HOST_SPECIFIER = '#docs-host';

/** The import a wrapped module always has: the host's types and helpers. */
const HOST_IMPORT = `import type { DocsContext } from '${HOST_SPECIFIER}';`;

const NOT_PLUGIN_CODE: Readonly<Record<string, string>> = {
  '': 'a block with no language: plain text, not plugin code',
  'bash': 'shell commands, not plugin code',
  'console': 'shell commands, not plugin code',
  'json': 'a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code',
  'md': 'Markdown, not plugin code',
  'mermaid': 'a Mermaid diagram, not plugin code',
  'sh': 'shell commands, not plugin code',
  'shell': 'shell commands, not plugin code',
  'yaml': 'a YAML file (a GitHub Actions workflow), not plugin code',
  'yml': 'a YAML file (a GitHub Actions workflow), not plugin code'
};

/** The names a snippet's `export` list carries, and the list itself. */
interface ExportList {
  readonly exports: string[];
  readonly line: string;
}

/** A snippet parsed on its own, with the syntax errors the parse found. */
interface ParseResult {
  readonly diagnostics: readonly DiagnosticWithLocation[];
  readonly sourceFile: SourceFile;
}

interface SourceFileWithParseDiagnostics extends SourceFile {
  readonly parseDiagnostics: readonly DiagnosticWithLocation[];
}

/** A snippet's body with its `import` statements taken out, and those statements. */
interface StrippedImports {
  readonly body: string;
  readonly imports: string[];
}

interface TextRange {
  readonly end: number;
  readonly start: number;
}

/** The indentation the host code nests a snippet by. */
const INDENT_SPACES = 2;

interface Analysis {
  readonly declared: Set<string>;
  readonly free: Set<string>;
  readonly usesThis: boolean;
  readonly viewIsEditorView: boolean;
}

/**
 * Classifies a snippet and, when it is runnable, wraps it in a host module.
 *
 * The snippet's own code is kept verbatim. What is added is only: the imports of names it uses and does not import
 * (from `obsidian`, CodeMirror, or an earlier block on the same page), an `export` list so a later block can take
 * its names, and the `run(context)` function the generated command calls.
 *
 * @param snippet - The snippet.
 * @param knownModules - The packages a missing name can come from, with what each exports.
 * @param pageModules - The modules of the runnable snippets before this one on the same page, nearest first.
 * @returns The classification and the module.
 */
export function wrapSnippet(snippet: DocsSnippet, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): WrappedSnippet {
  const notPluginCode = NOT_PLUGIN_CODE[snippet.lang];
  if (notPluginCode !== undefined) {
    return notRunnable(notPluginCode);
  }

  switch (snippet.lang) {
    case 'css':
      return wrapCss(snippet.code);
    case 'javascript':
    case 'js':
      if (snippet.code.includes('esbuild')) {
        return notRunnable('JavaScript for the build script (`esbuild.config.mjs`), not plugin code');
      }
      break;
    case 'ts':
    case 'typescript':
      break;
    case 'tsx':
      return notRunnable(snippet.code.includes('<script') ? 'a Svelte component, which this preset does not compile' : 'JSX for React, which this preset does not install');
    default:
      return notRunnable(`a \`${snippet.lang}\` block, not plugin code`);
  }

  if (snippet.code.trim() === '') {
    return notRunnable('an empty block');
  }

  return wrapTypeScript(snippet.code, knownModules, pageModules);
}

function analyze(nodes: readonly Node[]): Analysis {
  const declared = new Set<string>();
  const referenced = new Set<string>();
  let usesThis = false;
  let viewIsEditorView = false;

  function addBindingNames(name: BindingName): void {
    if (isIdentifier(name)) {
      declared.add(name.text);
      return;
    }
    for (const element of name.elements) {
      if (!isOmittedExpression(element)) {
        addBindingNames(element.name);
      }
    }
  }

  function visit(node: Node): void {
    if (node.kind === SyntaxKind.ThisKeyword) {
      usesThis = true;
    }

    const declaredName = getDeclaredName(node);
    if (isVariableDeclaration(node) || isParameter(node) || isBindingElement(node)) {
      addBindingNames(node.name);
    } else if (declaredName !== null) {
      declared.add(declaredName);
    } else if (isIdentifier(node) && isReference(node)) {
      referenced.add(node.text);
      if (node.text === 'view' && isPropertyAccessExpression(node.parent) && ['dispatch', 'plugin', 'state'].includes(node.parent.name.text)) {
        viewIsEditorView = true;
      }
    }

    forEachChild(node, visit);
  }

  for (const node of nodes) {
    visit(node);
  }

  const free = new Set([...referenced].filter((name) => !declared.has(name) && !isGlobal(name)));
  return { declared, free, usesThis, viewIsEditorView };
}

function buildImports(names: Iterable<string>, alreadyImported: ReadonlySet<string>, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): string[] {
  const bySpecifier = new Map<string, string[]>();
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    if (alreadyImported.has(name)) {
      continue;
    }
    const pageModule = pageModules.find((candidate) => candidate.exports.includes(name));
    const specifier = pageModule?.specifier ?? [...knownModules].find(([, exported]) => exported.has(name))?.[0];
    if (specifier === undefined) {
      continue;
    }
    bySpecifier.set(specifier, [...bySpecifier.get(specifier) ?? [], name]);
  }
  return [...bySpecifier].map(([specifier, imported]) => `import { ${imported.join(', ')} } from '${specifier}';`);
}

function constructorParameters(declaration: ClassDeclaration): null | readonly ParameterDeclaration[] {
  const constructor = declaration.members.find(isConstructorDeclaration);
  return constructor ? constructor.parameters : null;
}

function contextLines(free: ReadonlySet<string>, viewIsEditorView: boolean): string[] {
  const lines: string[] = [];
  for (const name of [...free].sort((a, b) => a.localeCompare(b))) {
    if (name === 'view') {
      lines.push(`const view = await context.${viewIsEditorView ? 'getEditorView' : 'getMarkdownView'}();`);
      continue;
    }
    const binding = CONTEXT_BINDINGS[name];
    if (binding !== undefined) {
      lines.push(`const ${name} = ${binding};`);
    }
  }
  return lines;
}

function exportList(statements: readonly Statement[]): ExportList {
  const exported: string[] = [];
  const values: string[] = [];
  // `isolatedModules` makes a type re-exported by name an error unless the export says it is a type.
  const types: string[] = [];
  for (const statement of statements) {
    const isExported = hasModifier(statement, SyntaxKind.ExportKeyword);
    const isDefault = hasModifier(statement, SyntaxKind.DefaultKeyword);
    const isType = isInterfaceDeclaration(statement) || isTypeAliasDeclaration(statement);
    for (const name of topLevelNames(statement)) {
      if (isDefault) {
        continue;
      }
      exported.push(name);
      if (!isExported) {
        (isType ? types : values).push(name);
      }
    }
  }
  const lines = [
    values.length > 0 ? `export { ${values.join(', ')} };` : '',
    types.length > 0 ? `export type { ${types.join(', ')} };` : ''
  ];
  return {
    exports: exported,
    line: lines.filter((line) => line !== '').join('\n')
  };
}

/** The name a declaration node introduces, or `null` when the node declares none. */
function getDeclaredName(node: Node): null | string {
  if (
    isFunctionDeclaration(node) || isClassDeclaration(node) || isInterfaceDeclaration(node) || isTypeAliasDeclaration(node)
    || isEnumDeclaration(node) || isFunctionExpression(node) || isClassExpression(node) || isTypeParameterDeclaration(node)
    || isImportClause(node) || isImportSpecifier(node) || isNamespaceImport(node)
  ) {
    return node.name?.text ?? null;
  }
  return null;
}

function hasModifier(node: Node, kind: SyntaxKind): boolean {
  return canHaveModifiers(node) && (getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
}

function heritageName(declaration: ClassDeclaration): string {
  const extendsClause = declaration.heritageClauses?.find((clause) => clause.token === SyntaxKind.ExtendsKeyword);
  const expression = extendsClause?.types[0]?.expression;
  return expression && isIdentifier(expression) ? expression.text : '';
}

function importedNames(statements: readonly Statement[]): Set<string> {
  const names = new Set<string>();
  for (const statement of statements) {
    if (!isImportDeclaration(statement) || !statement.importClause) {
      continue;
    }
    if (statement.importClause.name) {
      names.add(statement.importClause.name.text);
    }
    const bindings = statement.importClause.namedBindings;
    if (bindings && isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.add(element.name.text);
      }
    } else if (bindings) {
      names.add(bindings.name.text);
    }
  }
  return names;
}

function indent(code: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return code.split('\n').map((line) => line === '' ? line : `${prefix}${line}`).join('\n');
}

function isDeclaration(statement: Statement): boolean {
  return isClassDeclaration(statement) || isFunctionDeclaration(statement) || isInterfaceDeclaration(statement)
    || isTypeAliasDeclaration(statement) || isEnumDeclaration(statement) || isImportDeclaration(statement)
    || (isVariableStatement(statement) && /^const\b/.test(statement.declarationList.getText()));
}

function isGlobal(name: string): boolean {
  return name in globalThis || ['activeDocument', 'activeWindow', 'console', 'createDiv', 'createEl', 'createFragment', 'createSpan', 'document', 'sleep', 'undefined', 'window'].includes(name);
}

/**
 * Whether an identifier refers to a binding, as opposed to naming a property, a member, a label or an import.
 *
 * Only references can be free names a snippet leaves for its host or an import to supply.
 */
function isReference(node: Identifier): boolean {
  return !NON_REFERENCE_POSITIONS.some((isNonReference) => isNonReference(node.parent, node));
}

function isSettingDefinition(expression: Expression): boolean {
  if (!isObjectLiteralExpression(expression)) {
    return false;
  }
  return expression.properties.some((property) => {
    if (!isPropertyAssignment(property) && !isMethodDeclaration(property)) {
      return false;
    }
    const name = isIdentifier(property.name) ? property.name.text : '';
    if (SETTING_DEFINITION_KEYS.has(name)) {
      return true;
    }
    return name === 'type' && isPropertyAssignment(property) && isStringLiteral(property.initializer) && SETTING_DEFINITION_TYPES.has(property.initializer.text);
  });
}

function joinModule(parts: readonly string[]): string {
  return `${parts.filter((part) => part !== '').join('\n\n')}\n`;
}

/** The positions in which an identifier names something rather than referring to a binding. */
const NON_REFERENCE_POSITIONS: readonly ((parent: Node, node: Identifier) => boolean)[] = [
  (parent, node): boolean => isPropertyAccessExpression(parent) && parent.name === node,
  (parent, node): boolean => isMemberName(parent, node),
  (parent, node): boolean => isQualifiedName(parent) && parent.right === node,
  (parent): boolean => isLabeledStatement(parent) || isBreakOrContinueStatement(parent) || isJsxAttribute(parent),
  (parent): boolean => isImportSpecifier(parent) || isExportSpecifier(parent) || isImportClause(parent) || isNamespaceImport(parent),
  (parent, node): boolean => isBindingElement(parent) && parent.propertyName === node
];

/**
 * What the host does with a class a declarations snippet declares: open it when it is a modal or a view, show it when
 * it is a settings tab, load it when it is a component. A class whose constructor needs an argument the host cannot
 * supply gets no action.
 */
function classAction(statement: ClassDeclaration): null | string {
  const name = statement.name?.text;
  if (name === undefined || hasModifier(statement, SyntaxKind.AbstractKeyword)) {
    return null;
  }
  const base = heritageName(statement);
  const parameters = constructorParameters(statement);
  const values = resolveArguments(parameters ?? []);
  if (MODAL_BASES.has(base)) {
    return values ? `context.openModal(new ${name}(${parameters === null ? 'context.app' : values.join(', ')}));` : null;
  }
  if (VIEW_BASES.has(base)) {
    return parameters === null || (parameters.length === 1 && values) ? `await context.openView((leaf) => new ${name}(leaf));` : null;
  }
  if (base === 'PluginSettingTab') {
    return `await context.showSettingTab((app, plugin) => new ${name}(app, plugin));`;
  }
  if (base === 'Component' && values) {
    return `context.addChildComponent(new ${name}(${values.join(', ')}));`;
  }
  return null;
}

/** What the host does with one top-level statement of a declarations snippet. */
function declarationActions(statement: Statement): string[] {
  if (isFunctionDeclaration(statement) && statement.name && statement.body) {
    const values = resolveArguments(statement.parameters);
    const name = statement.name.text;
    return values ? [`await context.showResult(await ${name}(${values.join(', ')}), '${name}()');`] : [];
  }
  if (isClassDeclaration(statement)) {
    const action = classAction(statement);
    return action === null ? [] : [action];
  }
  if (isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => {
      const initializer = declaration.initializer;
      const isEditorExtension = isIdentifier(declaration.name) && initializer !== undefined && isCallExpression(initializer)
        && EDITOR_EXTENSION_FACTORIES.has(initializer.expression.getText());
      return isEditorExtension ? [`context.toggleEditorExtension(${declaration.name.getText()});`] : [];
    });
  }
  return [];
}

function isMemberName(parent: Node, node: Identifier): boolean {
  return (isPropertyAssignment(parent) || isMethodDeclaration(parent) || isPropertyDeclaration(parent) || isPropertySignature(parent)
    || isMethodSignature(parent) || isGetAccessor(parent) || isSetAccessor(parent) || isEnumMember(parent)) && parent.name === node;
}

function notRunnable(reason: string): WrappedSnippet {
  return { exports: [], kind: 'not-runnable', module: '', reason };
}

function parse(code: string): ParseResult {
  // `parseDiagnostics` is internal, and the one place the syntax errors of a lone `createSourceFile` are kept.
  const sourceFile = createSourceFile('snippet.ts', code, ScriptTarget.Latest, true, ScriptKind.TS) as SourceFileWithParseDiagnostics;
  return { diagnostics: sourceFile.parseDiagnostics, sourceFile };
}

function parseFailure(diagnostics: readonly DiagnosticWithLocation[], sourceFile: SourceFile, lineOffset: number): string {
  const [first] = diagnostics;
  if (!first) {
    return 'does not parse as TypeScript';
  }
  const { line } = sourceFile.getLineAndCharacterOfPosition(first.start);
  return `does not parse as TypeScript: ${flattenDiagnosticMessageText(first.messageText, ' ')} (line ${String(line + 1 - lineOffset)} of the block)`;
}

/** Whether a top-level variable statement reads `this` or a name only the host can supply. */
function readsHostContext(statement: Statement): boolean {
  if (!isVariableStatement(statement)) {
    return false;
  }
  const analysis = analyze([statement]);
  return analysis.usesThis || [...analysis.free].some((name) => CONTEXT_BINDINGS[name] !== undefined || name === 'view');
}
function resolveArguments(parameters: readonly ParameterDeclaration[]): null | string[] {
  const values: string[] = [];
  for (const parameter of parameters) {
    if (parameter.questionToken || parameter.initializer) {
      break;
    }
    const type = parameter.type;
    if (type && (isFunctionTypeNode(type))) {
      values.push('(...values: unknown[]) => { void context.showResult(values); }');
      continue;
    }
    const typeName = type && isTypeReferenceNode(type) && isIdentifier(type.typeName) ? type.typeName.text : type?.getText() ?? '';
    const value = ARGUMENTS_BY_TYPE[typeName];
    if (value === undefined) {
      return null;
    }
    values.push(value);
  }
  return values;
}

/**
 * Points an import of a module the docs never show (`./modal`, `./main`, `emoji`) at the block on the same page that
 * declares the names it imports, when there is one. An import no block on the page satisfies is left as written, so
 * the type check reports it.
 */
function rewritePageImport(line: string, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): string {
  const parsed = parse(line).sourceFile.statements[0];
  if (!parsed || !isImportDeclaration(parsed) || !isStringLiteral(parsed.moduleSpecifier)) {
    return line;
  }
  const specifier = parsed.moduleSpecifier.text;
  const importClause = parsed.importClause;
  const bindings = importClause?.namedBindings;
  if (knownModules.has(specifier) || !importClause || importClause.name || !bindings || !isNamedImports(bindings)) {
    return line;
  }
  const names = bindings.elements.map((element) => (element.propertyName ?? element.name).text);
  const provider = pageModules.find((candidate) => names.every((name) => candidate.exports.includes(name)));
  if (!provider) {
    return line;
  }
  const start = parsed.moduleSpecifier.getStart();
  return `${line.slice(0, start)}'${provider.specifier}'${line.slice(parsed.moduleSpecifier.getEnd())}`;
}

function stripExportKeywords(code: string, statements: readonly Statement[]): string {
  const removals: TextRange[] = [];
  for (const statement of statements) {
    for (const modifier of canHaveModifiers(statement) ? getModifiers(statement) ?? [] : []) {
      if (modifier.kind === SyntaxKind.ExportKeyword || modifier.kind === SyntaxKind.DefaultKeyword) {
        removals.push({ end: modifier.getEnd(), start: modifier.getStart() });
      }
    }
  }
  let result = code;
  for (const removal of removals.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, removal.start) + result.slice(removal.end).replace(/^\s+/, '');
  }
  return result;
}

function stripImports(code: string, statements: readonly Statement[]): StrippedImports {
  const imports: string[] = [];
  let body = code;
  for (const statement of [...statements].reverse()) {
    if (isImportDeclaration(statement)) {
      imports.unshift(statement.getText());
      body = body.slice(0, statement.getFullStart()) + body.slice(statement.getEnd());
    }
  }
  return { body: body.replace(/^\s*\n/, ''), imports };
}

function topLevelNames(statement: Statement): string[] {
  if (
    (isClassDeclaration(statement) || isFunctionDeclaration(statement) || isInterfaceDeclaration(statement)
      || isTypeAliasDeclaration(statement) || isEnumDeclaration(statement)) && statement.name
  ) {
    return [statement.name.text];
  }
  if (isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => isIdentifier(declaration.name) ? [declaration.name.text] : []);
  }
  return [];
}

function wrapCss(code: string): WrappedSnippet {
  if (!code.includes('{')) {
    return notRunnable('a CSS fragment with no selector, so there is no rule to apply');
  }
  const literal = JSON.stringify(code);
  return {
    exports: [],
    kind: 'css',
    module: joinModule([
      HOST_IMPORT,
      `const css = ${literal};`,
      'export async function run(context: DocsContext): Promise<void> {\n  await context.toggleCss(css);\n}'
    ]),
    reason: ''
  };
}

function wrapDeclarations(body: string, statements: readonly Statement[], imports: readonly string[], exportLine: string): string {
  const actions = statements.flatMap(declarationActions);
  const declaredNames = statements.flatMap(topLevelNames).filter((name) => name !== '');
  if (actions.length === 0) {
    actions.push(`context.report(${JSON.stringify(`Declares ${declaredNames.join(', ') || 'only types'}. It compiles against the API, and there is nothing in it to run on its own.`)});`);
  }

  return joinModule([
    [HOST_IMPORT, ...imports].join('\n'),
    body.trim(),
    exportLine,
    `export async function run(context: DocsContext): Promise<void> {\n${indent(actions.join('\n'), INDENT_SPACES)}\n}`
  ]);
}

function wrapExpression(code: string, sourceFile: SourceFile, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): WrappedSnippet {
  const statement = sourceFile.statements[0];
  const expression = statement && isExpressionStatement(statement) && isParenthesizedExpression(statement.expression) ? statement.expression.expression : null;
  if (!expression) {
    return notRunnable('an expression the classifier could not read');
  }

  const analysis = analyze([expression]);
  const isDefinition = isSettingDefinition(expression);
  const free = new Set(analysis.free);
  if (isDefinition) {
    free.add('SettingDefinitionItem');
  }
  const imports = buildImports(free, new Set(), knownModules, pageModules);
  const thisType = analysis.usesThis ? 'this: DocsThis, ' : '';
  const show = isDefinition ? 'await context.showSettingDefinitions([value]);' : 'await context.showResult(value);';
  const declaration = isDefinition ? 'const value: SettingDefinitionItem = (' : 'const value = (';
  const callee = analysis.usesThis ? 'snippet.call(context.thisValue(), context)' : 'snippet(context)';

  return {
    exports: [],
    kind: 'expression',
    module: joinModule([
      [analysis.usesThis ? `import type { DocsContext, DocsThis } from '${HOST_SPECIFIER}';` : HOST_IMPORT, ...imports].join('\n'),
      `async function snippet(${thisType}context: DocsContext) {\n${indent([...contextLines(analysis.free, analysis.viewIsEditorView), `${declaration}\n${indent(code, INDENT_SPACES)}\n);`, show].join('\n'), INDENT_SPACES)}\n}`,
      `export async function run(context: DocsContext): Promise<void> {\n  await ${callee};\n}`
    ]),
    reason: ''
  };
}

function wrapMembers(code: string, sourceFile: SourceFile, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): WrappedSnippet {
  const declaration = sourceFile.statements[0];
  if (!declaration || !isClassDeclaration(declaration)) {
    return notRunnable('class members the classifier could not read');
  }

  const memberNames = declaration.members.flatMap((member) => member.name && isIdentifier(member.name) ? [member.name.text] : []);
  const isSettingTab = memberNames.some((name) => SETTING_TAB_MEMBERS.has(name));
  const analysis = analyze([declaration]);
  analysis.free.add(isSettingTab ? 'PluginSettingTab' : 'Plugin');
  const imports = buildImports(analysis.free, new Set(), knownModules, pageModules);
  const header = isSettingTab
    ? 'class DocsSnippetSettingTab extends PluginSettingTab {\n  declare plugin: DocsPlugin;\n'
    : 'class DocsSnippetPlugin extends Plugin {\n  declare settings: DocsPlugin[\'settings\'];\n\n  async saveSettings(): Promise<void> {\n    await this.saveData(this.settings);\n  }\n';
  const run = isSettingTab
    ? 'export async function run(context: DocsContext): Promise<void> {\n  await context.showSettingTab((app, plugin) => new DocsSnippetSettingTab(app, plugin));\n}'
    : 'export async function run(context: DocsContext): Promise<void> {\n  await context.toggleChildPlugin(DocsSnippetPlugin);\n}';

  return {
    exports: [],
    kind: 'members',
    module: joinModule([
      [`import type { DocsContext, DocsPlugin } from '${HOST_SPECIFIER}';`, ...imports].join('\n'),
      `${header}\n${indent(code, INDENT_SPACES)}\n}`,
      run
    ]),
    reason: ''
  };
}

function wrapModule(code: string, sourceFile: SourceFile, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): WrappedSnippet {
  const statements = sourceFile.statements;
  const imported = importedNames(statements);
  const pluginClass = statements.find((statement): statement is ClassDeclaration => isClassDeclaration(statement) && heritageName(statement) === 'Plugin' && statement.name !== undefined);
  const nonImports = statements.filter((statement) => !isImportDeclaration(statement));
  const analysis = analyze(statements);
  // A `const` that reads `this` or a name the host supplies (`view`, `app`, `file`) is code that runs, not a declaration
  // A later block takes: hoisted to the module, it would read those before anything supplied them.
  const isDeclarationsOnly = nonImports.length > 0 && nonImports.every(isDeclaration) && !nonImports.some(readsHostContext);

  const free = new Set([...analysis.free].filter((name) => !imported.has(name)));
  const { body, imports } = stripImports(code, statements);
  const rewrittenImports = imports.map((line) => rewritePageImport(line, knownModules, pageModules));

  if (pluginClass?.name) {
    const autoImports = buildImports(free, imported, knownModules, pageModules);
    const { exports, line } = exportList(nonImports);
    return {
      exports,
      kind: 'plugin-class',
      module: joinModule([
        [HOST_IMPORT, ...rewrittenImports, ...autoImports].join('\n'),
        body.trim(),
        line,
        `export async function run(context: DocsContext): Promise<void> {\n  await context.toggleChildPlugin(${pluginClass.name.text});\n}`
      ]),
      reason: ''
    };
  }

  if (isDeclarationsOnly) {
    const autoImports = buildImports(free, imported, knownModules, pageModules);
    const { exports, line } = exportList(nonImports);
    return {
      exports,
      kind: 'declarations',
      module: wrapDeclarations(body, nonImports, [...rewrittenImports, ...autoImports], line),
      reason: ''
    };
  }

  const contextNames = new Set([...free].filter((name) => CONTEXT_BINDINGS[name] !== undefined || name === 'view'));
  const autoImports = buildImports([...free].filter((name) => !contextNames.has(name)), imported, knownModules, pageModules);
  const strippedBody = stripExportKeywords(code, statements);
  const statementsBody = stripImports(strippedBody, parse(strippedBody).sourceFile.statements).body.trim();
  const thisType = analysis.usesThis ? 'this: DocsThis, ' : '';
  const callee = analysis.usesThis ? 'snippet.call(context.thisValue(), context)' : 'snippet(context)';

  return {
    exports: [],
    kind: 'statements',
    module: joinModule([
      [analysis.usesThis ? `import type { DocsContext, DocsThis } from '${HOST_SPECIFIER}';` : HOST_IMPORT, ...rewrittenImports, ...autoImports].join('\n'),
      `async function snippet(${thisType}context: DocsContext) {\n${indent([...contextLines(contextNames, analysis.viewIsEditorView), `{\n${indent(statementsBody, INDENT_SPACES)}\n}`].join('\n'), INDENT_SPACES)}\n}`,
      `export async function run(context: DocsContext): Promise<void> {\n  await context.showResult(await ${callee});\n}`
    ]),
    reason: ''
  };
}

function wrapTypeScript(code: string, knownModules: KnownModuleExports, pageModules: readonly PageModule[]): WrappedSnippet {
  const startsWithBrace = code.trimStart().startsWith('{');
  const asModule = parse(code);
  const asExpression = parse(`(\n${code}\n);`);

  if (startsWithBrace && asExpression.diagnostics.length === 0) {
    return wrapExpression(code, asExpression.sourceFile, knownModules, pageModules);
  }

  if (asModule.diagnostics.length === 0) {
    return wrapModule(code, asModule.sourceFile, knownModules, pageModules);
  }

  const asMembers = parse(`class DocsSnippetMembers {\n${code}\n}`);
  if (asMembers.diagnostics.length === 0) {
    return wrapMembers(code, asMembers.sourceFile, knownModules, pageModules);
  }

  if (asExpression.diagnostics.length === 0) {
    return wrapExpression(code, asExpression.sourceFile, knownModules, pageModules);
  }

  const asObjectMembers = parse(`({\n${code}\n});`);
  if (asObjectMembers.diagnostics.length === 0) {
    return notRunnable('a fragment of an object literal: members shown out of the object they belong to');
  }

  return notRunnable(parseFailure(asModule.diagnostics, asModule.sourceFile, 0));
}
