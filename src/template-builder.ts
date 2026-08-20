/** One `.lintstagedrc` entry: the glob and the commands registered against it, in registration order. */
export interface LintStagedPattern {
  commands: string[];
  pattern: string;
}

export class Dependency {
  public readonly packageName: string;

  /**
   * The spec to write into `package.json`, or `null` to let it be resolved -- from the pin table if the
   * package is pinned, otherwise from the registry. Set one only when the package must carry that exact
   * spec regardless of what either would produce.
   */
  public readonly version: null | string;

  public constructor(packageName: string, version: null | string = null) {
    this.packageName = packageName;
    this.version = version;
  }
}

export class TemplateBuilder {
  public get dependencies(): Dependency[] {
    return [...this._dependencies.values()].sort((a, b) => a.packageName.localeCompare(b.packageName));
  }

  public get lintStagedPatterns(): LintStagedPattern[] {
    return [...this._lintStagedPatterns.entries()].map(([pattern, commands]) => ({ commands: [...commands], pattern }));
  }

  public get partials(): Set<string> {
    return new Set(this._partials);
  }

  public get scripts(): Record<string, string> {
    return Object.fromEntries(Object.entries(this._scripts).sort(([a], [b]) => a.localeCompare(b)));
  }

  public get sentenceCaseBrands(): string[] {
    return [...this._sentenceCaseBrands].sort((a, b) => a.localeCompare(b));
  }

  public get templateFiles(): Set<string> {
    return new Set(this._templateFiles);
  }

  private readonly _dependencies = new Map<string, Dependency>();

  private readonly _lintStagedPatterns = new Map<string, string[]>();

  private readonly _partials = new Set<string>();

  private readonly _scripts: Record<string, string> = {};

  private readonly _sentenceCaseBrands = new Set<string>();

  private readonly _templateFiles = new Set<string>();

  public addFiles(paths: string[]): this {
    for (const p of paths) {
      this._templateFiles.add(p);
    }
    return this;
  }

  /**
   * Registers a `.lintstagedrc` command.
   *
   * The commands are collected here rather than concatenated from template partials because a partial can
   * only ever emit `'<command>',` -- and the trailing comma the last one leaves behind is exactly what the
   * generated formatter config strips, so the file failed its own `format:check`.
   */
  public addLintStagedCommand(pattern: string, command: string): this {
    const commands = this._lintStagedPatterns.get(pattern) ?? [];
    commands.push(command);
    this._lintStagedPatterns.set(pattern, commands);
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

  /**
   * Registers a proper noun that `obsidianmd/ui/sentence-case` must not flag.
   *
   * Collected here rather than concatenated from template partials for the same reason as
   * {@link addLintStagedCommand}: a partial can only emit `'<brand>',`, and the last trailing comma is
   * what the generated formatter config strips.
   */
  public addSentenceCaseBrand(brand: string): this {
    this._sentenceCaseBrands.add(brand);
    return this;
  }
}
