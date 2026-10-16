import {
  describe,
  expect,
  it
} from 'vitest';

import type { DocsSnippet } from './extract-snippets.ts';
import type { KnownModuleExports } from './wrap-snippet.ts';

import {
  HOST_SPECIFIER,
  wrapSnippet
} from './wrap-snippet.ts';

const KNOWN_MODULES: KnownModuleExports = new Map([
  ['@codemirror/state', new Set(['StateEffect', 'StateField'])],
  ['obsidian', new Set(['MarkdownView', 'Modal', 'Notice', 'Plugin', 'PluginSettingTab', 'SettingDefinitionItem', 'TFile', 'TFolder', 'Vault'])]
]);

function snippet(code: string, lang = 'ts'): DocsSnippet {
  return { code, headings: ['Vault'], lang, line: 1, page: 'Plugins/Vault', title: '' };
}

describe('wrapSnippet', () => {
  it('lists a block that is not plugin code with the reason', () => {
    expect(wrapSnippet(snippet('npm install', 'bash'), KNOWN_MODULES, [])).toEqual({
      exports: [],
      kind: 'not-runnable',
      module: '',
      reason: 'shell commands, not plugin code'
    });
  });

  it('loads a module declaring a plugin class as a child plugin, importing what the block leaves out', () => {
    const wrapped = wrapSnippet(snippet('export default class ExamplePlugin extends Plugin {\n  async onload() {}\n}'), KNOWN_MODULES, []);

    expect(wrapped.kind).toBe('plugin-class');
    expect(wrapped.module).toContain('import { Plugin } from \'obsidian\';');
    expect(wrapped.module).toContain('await context.toggleChildPlugin(ExamplePlugin);');
  });

  it('runs statements with `this` bound and the implicit names supplied by the host', () => {
    const wrapped = wrapSnippet(snippet('const folderOrFile = this.app.vault.getAbstractFileByPath(\'x\');\nif (folderOrFile instanceof TFile) {\n  console.log(file.path);\n}'), KNOWN_MODULES, []);

    expect(wrapped.kind).toBe('statements');
    expect(wrapped.module).toContain(`import type { DocsContext, DocsThis } from '${HOST_SPECIFIER}';`);
    expect(wrapped.module).toContain('import { TFile } from \'obsidian\';');
    expect(wrapped.module).toContain('const file = await context.getFile();');
    expect(wrapped.module).toContain('snippet.call(context.thisValue(), context)');
  });

  it('calls a function whose arguments the host can supply', () => {
    const wrapped = wrapSnippet(snippet('function writeCurrentDate(vault: Vault, file: TFile): Promise<void> {\n  return vault.modify(file, \'x\');\n}'), KNOWN_MODULES, []);

    expect(wrapped.kind).toBe('declarations');
    expect(wrapped.exports).toEqual(['writeCurrentDate']);
    expect(wrapped.module).toContain('export { writeCurrentDate };');
    expect(wrapped.module).toContain('await writeCurrentDate(context.app.vault, await context.getFile())');
  });

  it('exports a declared type with `export type`, which `isolatedModules` requires', () => {
    const wrapped = wrapSnippet(snippet('interface Book {\n  title: string;\n}\nconst ALL_BOOKS: Book[] = [];'), KNOWN_MODULES, []);

    expect(wrapped.module).toContain('export { ALL_BOOKS };');
    expect(wrapped.module).toContain('export type { Book };');
  });

  it('opens a modal the block declares', () => {
    const wrapped = wrapSnippet(snippet('export class ExampleModal extends Modal {\n  onOpen() {}\n}'), KNOWN_MODULES, []);

    expect(wrapped.module).toContain('context.openModal(new ExampleModal(context.app));');
  });

  it('toggles an editor extension the block declares', () => {
    const wrapped = wrapSnippet(snippet('export const field = StateField.define<number>({ create: () => 0, update: (value) => value });'), KNOWN_MODULES, []);

    expect(wrapped.module).toContain('import { StateField } from \'@codemirror/state\';');
    expect(wrapped.module).toContain('context.toggleEditorExtension(field);');
  });

  it('imports a name from the block on the same page that declares it', () => {
    const wrapped = wrapSnippet(snippet('new ExampleModal(this.app).open();'), KNOWN_MODULES, [{ exports: ['ExampleModal'], specifier: './01-intro.ts' }]);

    expect(wrapped.module).toContain('import { ExampleModal } from \'./01-intro.ts\';');
  });

  it('points an import of a module the docs never show at the block that declares its names', () => {
    const wrapped = wrapSnippet(snippet('import { ExampleModal } from \'./modal\';\nnew ExampleModal(this.app).open();'), KNOWN_MODULES, [{ exports: ['ExampleModal'], specifier: './01-intro.ts' }]);

    expect(wrapped.module).toContain('import { ExampleModal } from \'./01-intro.ts\';');
    expect(wrapped.module).not.toContain('./modal');
  });

  it('wraps class members on their own in a plugin, or in a settings tab when they are its members', () => {
    expect(wrapSnippet(snippet('onload() {\n  this.addRibbonIcon(\'dice\', \'Hi\', () => {});\n}'), KNOWN_MODULES, []).module).toContain('class DocsSnippetPlugin extends Plugin {');
    expect(wrapSnippet(snippet('getSettingDefinitions() {\n  return [];\n}'), KNOWN_MODULES, []).module).toContain('class DocsSnippetSettingTab extends PluginSettingTab {');
  });

  it('shows a declarative setting definition in a settings tab', () => {
    const wrapped = wrapSnippet(snippet('{ name: \'Accent color\', control: { type: \'color\', key: \'accent\' } }'), KNOWN_MODULES, []);

    expect(wrapped.kind).toBe('expression');
    expect(wrapped.module).toContain('const value: SettingDefinitionItem = (');
    expect(wrapped.module).toContain('await context.showSettingDefinitions([value]);');
  });

  it('toggles a stylesheet, and lists a CSS fragment with no selector as not runnable', () => {
    expect(wrapSnippet(snippet('body {\n  --ribbon-background: magenta;\n}', 'css'), KNOWN_MODULES, []).module).toContain('await context.toggleCss(css);');
    expect(wrapSnippet(snippet('color: var(--color-red);', 'css'), KNOWN_MODULES, []).kind).toBe('not-runnable');
  });

  it('runs a constant that reads a name the host supplies, rather than hoisting it as a declaration', () => {
    const wrapped = wrapSnippet(snippet('// @ts-expect-error, not typed\nconst editorView = view.editor.cm as EditorView;'), KNOWN_MODULES, []);

    expect(wrapped.kind).toBe('statements');
    expect(wrapped.module).toContain('const view = await context.getMarkdownView();');
  });

  it('says why a block that does not parse is not runnable', () => {
    const wrapped = wrapSnippet(snippet('let myElement: HTMLElement = ...;'), KNOWN_MODULES, []);

    expect(wrapped.kind).toBe('not-runnable');
    expect(wrapped.reason).toMatch(/^does not parse as TypeScript: .+ \(line 1 of the block\)$/);
  });
});
