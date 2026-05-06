export class Dependency {
  public readonly packageName: string;
  public readonly version: string;

  public constructor(packageName: string, version = 'latest') {
    this.packageName = packageName;
    this.version = version;
  }
}

export class TemplateBuilder {
  public get dependencies(): Dependency[] {
    return [...this._dependencies.values()].sort((a, b) => a.packageName.localeCompare(b.packageName));
  }

  public get partials(): Set<string> {
    return new Set(this._partials);
  }

  public get scripts(): Record<string, string> {
    return Object.fromEntries(Object.entries(this._scripts).sort(([a], [b]) => a.localeCompare(b)));
  }

  public get templateFiles(): Set<string> {
    return new Set(this._templateFiles);
  }

  private readonly _dependencies = new Map<string, Dependency>();

  private readonly _partials = new Set<string>();

  private readonly _scripts: Record<string, string> = {};

  private readonly _templateFiles = new Set<string>();

  public addFiles(paths: string[]): this {
    for (const p of paths) {
      this._templateFiles.add(p);
    }
    return this;
  }

  public addPackage(packageName: string, version?: string): this {
    this._dependencies.set(packageName, new Dependency(packageName, version));
    return this;
  }

  public addPartial(name: string): this {
    this._partials.add(name);
    return this;
  }

  public addScript(name: string, command?: string): this {
    if (!command) {
      const scriptName = name.replaceAll(':', '-');
      command = `jiti scripts/${scriptName}.ts`;
    }
    this._scripts[name] = command;
    return this;
  }
}
