export class Dependency {
  readonly packageName: string;
  readonly version: string;

  constructor(packageName: string, version = 'latest') {
    this.packageName = packageName;
    this.version = version;
  }
}

export class TemplateBuilder {
  private readonly _dependencies = new Map<string, Dependency>();
  private readonly _partials = new Set<string>();
  private readonly _scripts: Record<string, string> = {};
  private readonly _templateFiles = new Set<string>();

  addPackage(packageName: string, version?: string): this {
    this._dependencies.set(packageName, new Dependency(packageName, version));
    return this;
  }

  addFiles(paths: string[]): this {
    for (const p of paths) {
      this._templateFiles.add(p);
    }
    return this;
  }

  addPartial(name: string): this {
    this._partials.add(name);
    return this;
  }

  addScript(name: string, command?: string): this {
    if (!command) {
      const scriptName = name.replaceAll(':', '-');
      command = `jiti scripts/${scriptName}.ts`;
    }
    this._scripts[name] = command;
    return this;
  }

  get dependencies(): Dependency[] {
    return [...this._dependencies.values()].sort((a, b) => a.packageName.localeCompare(b.packageName));
  }

  get partials(): Set<string> {
    return new Set(this._partials);
  }

  get scripts(): Record<string, string> {
    return { ...this._scripts };
  }

  get templateFiles(): Set<string> {
    return new Set(this._templateFiles);
  }
}
