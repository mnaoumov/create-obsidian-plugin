// The host every docs snippet runs in. Each snippet module next to this file holds one code block from
// https://docs.obsidian.md (obsidianmd/obsidian-developer-docs) verbatim, plus a `run(context)` function that
// create-obsidian-plugin generated around it. `run` is what the snippet's command calls, and `context` is this
// file's `DocsContext`: everything a snippet needs that the docs leave to the reader, such as a plugin to
// register things on, a note to work with, an editor, or an element to draw into.

import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type {
  App,
  Editor,
  PluginManifest,
  SettingDefinitionItem,
  View,
  WorkspaceLeaf
} from 'obsidian';

import {
  Component,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  TFile
} from 'obsidian';

/** One docs snippet, as `index.ts` registers it. */
export interface DocsEntry {
  /** Unique within the showcase, and the suffix of the command id. */
  id: string;
  /** Loads the snippet's module. The module is evaluated only when its command first runs. */
  load(): Promise<{ run(context: DocsContext): Promise<void> }>;
  /** The command name: the docs page, the heading the snippet sits under, and its position. */
  name: string;
  /** The docs page the snippet comes from. */
  source: string;
}

/** The plugin the docs' snippets assume: `ExamplePlugin`, with a `settings` object and `saveSettings()`. */
export interface DocsPlugin extends Plugin {
  // The docs never declare one settings shape, and each snippet reads its own keys.
  settings: Record<string, any>;
  saveSettings(): Promise<void>;
}

/**
 * What `this` is when a snippet's statements use it. Most snippets are written as the body of a plugin method
 * (`this.app`, `this.addCommand`), and the settings ones as the body of a settings tab method (`this.plugin`,
 * `this.update()`), so the value is a plugin that answers both.
 */
export interface DocsThis extends DocsPlugin {
  plugin: DocsPlugin;
  update(): void;
}

/** What a snippet's host supplies. See the comment at the top of this file. */
export interface DocsContext {
  readonly app: App;
  /** The showcase plugin itself. */
  readonly plugin: Plugin;
  addChildComponent(component: Component): void;
  getContainerEl(): HTMLElement;
  getEditor(): Promise<Editor>;
  getEditorView(): Promise<EditorView>;
  getFile(): Promise<TFile>;
  getLeaf(): WorkspaceLeaf;
  getMarkdownView(): Promise<MarkdownView>;
  openModal(modal: Modal): void;
  openView(createView: (leaf: WorkspaceLeaf) => View): Promise<void>;
  report(message: string): void;
  showResult(value: unknown, label?: string): Promise<void>;
  showSettingDefinitions(items: SettingDefinitionItem[]): Promise<void>;
  showSettingTab(createTab: (app: App, plugin: DocsPlugin) => PluginSettingTab): Promise<void>;
  thisValue(): DocsThis;
  toggleChildPlugin(pluginClass: new (...args: any[]) => Plugin): Promise<void>;
  toggleCss(css: string): Promise<void>;
  toggleEditorExtension(extension: Extension): void;
}

const SCRATCH_FOLDER = 'Docs showcase';
const SCRATCH_NOTE = `${SCRATCH_FOLDER}/Scratch note.md`;
// Content the snippets have something to act on: a `:)` for the emoji ones, list items for the decorations.
const SCRATCH_NOTE_CONTENT = '# Scratch note\n\nThe docs showcase runs snippets against this note. Hello :) world.\n\n- one\n- two\n- three\n';
const RESULT_PREVIEW_LENGTH = 300;

/**
 * Registers one command per docs snippet on the showcase plugin.
 *
 * @param plugin - The showcase plugin.
 * @param entries - The snippets, as `index.ts` lists them.
 */
export function registerDocsEntries(plugin: Plugin, entries: readonly DocsEntry[]): void {
  const editorExtensions: Extension[] = [];
  plugin.registerEditorExtension(editorExtensions);
  const children = new Map<string, Component>();

  for (const entry of entries) {
    plugin.addCommand({
      callback: async () => {
        const context = new HostContext(plugin, entry, editorExtensions, children);
        try {
          const module = await entry.load();
          await module.run(context);
        } catch (error) {
          console.error(`Docs snippet "${entry.name}" (${entry.source}) threw`, error);
          new Notice(`${entry.name} threw: ${error instanceof Error ? error.message : String(error)}. The developer console has the details.`);
          // Rethrown so that whatever runs the command can tell it failed: the integration suite awaits it.
          throw error;
        }
      },
      id: `docs-${entry.id}`,
      name: `Docs: ${entry.name}`
    });
  }
}

/**
 * A plugin with no files of its own, which the snippets load and register things on: each snippet's commands,
 * ribbon icons, events and settings tab land on one of these, and running the snippet's command again unloads it
 * and everything it registered.
 */
class DocsHostPlugin extends Plugin implements DocsThis {
  public plugin: DocsPlugin = this;
  public settings: Record<string, any> = {};
  private data: unknown = null;

  public override async loadData(): Promise<any> {
    return this.data;
  }

  public override async saveData(data: unknown): Promise<void> {
    this.data = data;
  }

  public async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  public update(): void {
    new Notice('The snippet asked its settings tab to update.');
  }
}

class HostContext implements DocsContext {
  public readonly app: App;
  private containerEl: HTMLElement | null = null;

  public constructor(
    public readonly plugin: Plugin,
    private readonly entry: DocsEntry,
    private readonly editorExtensions: Extension[],
    private readonly children: Map<string, Component>
  ) {
    this.app = plugin.app;
  }

  public addChildComponent(component: Component): void {
    this.replaceChild(new DocsHostPlugin(this.app, this.childManifest())).addChild(component);
    new Notice(`${this.entry.name}: loaded its component. Run the command again to unload it.`);
  }

  public getContainerEl(): HTMLElement {
    if (!this.containerEl) {
      const modal = new Modal(this.app);
      modal.setTitle(this.entry.name);
      modal.open();
      this.containerEl = modal.contentEl;
    }
    return this.containerEl;
  }

  public async getEditor(): Promise<Editor> {
    return (await this.getMarkdownView()).editor;
  }

  public async getEditorView(): Promise<EditorView> {
    // The docs' own way to reach CodeMirror: https://docs.obsidian.md/Plugins/Editor/Communicating+with+editor+extensions
    return ((await this.getMarkdownView()).editor as unknown as { cm: EditorView }).cm;
  }

  public async getFile(): Promise<TFile> {
    const existing = this.app.vault.getFileByPath(SCRATCH_NOTE);
    if (existing) {
      return existing;
    }
    if (!this.app.vault.getFolderByPath(SCRATCH_FOLDER)) {
      await this.app.vault.createFolder(SCRATCH_FOLDER);
    }
    return await this.app.vault.create(SCRATCH_NOTE, SCRATCH_NOTE_CONTENT);
  }

  public getLeaf(): WorkspaceLeaf {
    return this.app.workspace.getMostRecentLeaf() ?? this.app.workspace.getLeaf(false);
  }

  public async getMarkdownView(): Promise<MarkdownView> {
    const file = await this.getFile();
    let leaf = this.app.workspace.getLeavesOfType('markdown').find((candidate) => candidate.view instanceof MarkdownView && candidate.view.file === file);
    if (!leaf) {
      leaf = this.app.workspace.getLeaf('tab');
      await leaf.openFile(file, { state: { mode: 'source' } });
    }
    await this.app.workspace.revealLeaf(leaf);
    if (!(leaf.view instanceof MarkdownView)) {
      throw new Error(`${SCRATCH_NOTE} did not open in a Markdown view.`);
    }
    return leaf.view;
  }

  public openModal(modal: Modal): void {
    modal.open();
  }

  public async openView(createView: (leaf: WorkspaceLeaf) => View): Promise<void> {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.open(createView(leaf));
  }

  public report(message: string): void {
    console.log(`${this.entry.name}: ${message}`);
    new Notice(`${this.entry.name}: ${message}`);
  }

  public async showResult(value: unknown, label?: string): Promise<void> {
    const resolved = await value;
    const prefix = label ? `${this.entry.name}: ${label}` : this.entry.name;
    if (resolved === undefined) {
      new Notice(`${prefix} ran. Anything it logged is in the developer console.`);
      return;
    }
    console.log(prefix, resolved);
    new Notice(`${prefix} returned ${preview(resolved)}`);
  }

  public async showSettingDefinitions(items: SettingDefinitionItem[]): Promise<void> {
    await this.showSettingTab((app, plugin) => new DefinitionsSettingTab(app, plugin, items));
  }

  public async showSettingTab(createTab: (app: App, plugin: DocsPlugin) => PluginSettingTab): Promise<void> {
    const child = this.replaceChild(new DocsHostPlugin(this.app, this.childManifest()));
    child.addSettingTab(createTab(this.app, child));
    new Notice(`${this.entry.name}: added a settings tab named "${child.manifest.name}". Open Settings to see it.`);
  }

  public thisValue(): DocsThis {
    return this.replaceChild(new DocsHostPlugin(this.app, this.childManifest()));
  }

  public async toggleChildPlugin(pluginClass: new (...args: any[]) => Plugin): Promise<void> {
    if (this.children.has(this.entry.id)) {
      this.removeChild();
      new Notice(`${this.entry.name}: unloaded the example plugin and everything it registered.`);
      return;
    }

    // In-memory data, so an example that saves its settings does not overwrite the showcase's own.
    const HostedPlugin = class extends pluginClass {
      private hostedData: unknown = null;

      public override async loadData(): Promise<any> {
        return this.hostedData;
      }

      public override async saveData(data: unknown): Promise<void> {
        this.hostedData = data;
      }
    };
    this.replaceChild(new HostedPlugin(this.app, this.childManifest()));
    new Notice(`${this.entry.name}: loaded the example plugin. What it registers is live until you run this command again.`);
  }

  public async toggleCss(css: string): Promise<void> {
    const id = `docs-showcase-${this.entry.id}`;
    const existing = activeDocument.getElementById(id);
    if (existing) {
      existing.remove();
      new Notice(`${this.entry.name}: removed the stylesheet.`);
      return;
    }
    const style = activeDocument.head.createEl('style', { attr: { id }, text: css });
    this.plugin.register(() => style.remove());
    new Notice(`${this.entry.name}: applied the stylesheet. Run the command again to remove it.`);
  }

  public toggleEditorExtension(extension: Extension): void {
    const index = this.editorExtensions.indexOf(extension);
    if (index === -1) {
      this.editorExtensions.push(extension);
      new Notice(`${this.entry.name}: enabled the editor extension. Run the command again to disable it.`);
    } else {
      this.editorExtensions.splice(index, 1);
      new Notice(`${this.entry.name}: disabled the editor extension.`);
    }
    this.app.workspace.updateOptions();
  }

  private childManifest(): PluginManifest {
    return {
      ...this.plugin.manifest,
      id: `${this.plugin.manifest.id}-docs-${this.entry.id}`,
      name: `Docs: ${this.entry.name}`
    };
  }

  private removeChild(): void {
    const previous = this.children.get(this.entry.id);
    if (previous) {
      this.plugin.removeChild(previous);
      this.children.delete(this.entry.id);
    }
  }

  private replaceChild<T extends Component>(child: T): T {
    this.removeChild();
    this.children.set(this.entry.id, child);
    return this.plugin.addChild(child);
  }
}

class DefinitionsSettingTab extends PluginSettingTab {
  public constructor(app: App, plugin: Plugin, private readonly items: SettingDefinitionItem[]) {
    super(app, plugin);
  }

  public override getSettingDefinitions(): SettingDefinitionItem[] {
    return this.items;
  }
}

function preview(value: unknown): string {
  let text: string;
  if (typeof value === 'string') {
    text = JSON.stringify(value);
  } else if (value instanceof TFile) {
    text = value.path;
  } else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  return text.length > RESULT_PREVIEW_LENGTH ? `${text.slice(0, RESULT_PREVIEW_LENGTH)}...` : text;
}
