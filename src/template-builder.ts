/** One `.depcheckrc.json` entry: a declared package depcheck cannot see used, and the reference proving it is. */
export interface DepcheckIgnore {
  packageName: string;
  reason: string;
}

/** One `.lintstagedrc` entry: the glob and the commands registered against it, in registration order. */
export interface LintStagedPattern {
  commands: string[];
  pattern: string;
}

/**
 * The shape every partial name must have: kebab-case, so it holds no `_`, no `.` and no `@`.
 *
 * A template on disk is recognized as a partial by what follows the LAST `_` in its basename, and only
 * when that tail reads as a partial name (see `isPartialTemplatePath` in `templates.ts`). Requiring the
 * name to be kebab-case is what lets a real filename keep its underscores: `bug_report.yml` ends in
 * `report.yml`, which no partial can be called, so it is a template of its own. A name outside this
 * shape would make its partials read as plain templates, which is why `addPartial` refuses one.
 */
export const PARTIAL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  public get badges(): string[] {
    return [...this._badges];
  }

  public get depcheckIgnores(): DepcheckIgnore[] {
    return [...this._depcheckIgnores.entries()]
      .map(([packageName, reason]) => ({ packageName, reason }))
      .sort((a, b) => a.packageName.localeCompare(b.packageName));
  }

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

  private readonly _badges: string[] = [];

  private readonly _depcheckIgnores = new Map<string, string>();

  private readonly _dependencies = new Map<string, Dependency>();

  private readonly _lintStagedPatterns = new Map<string, string[]>();

  private readonly _partials = new Set<string>();

  private readonly _scripts: Record<string, string> = {};

  private readonly _sentenceCaseBrands = new Set<string>();

  private readonly _templateFiles = new Set<string>();

  /**
   * Registers a README badge, rendered in registration order on the line under the title.
   *
   * Collected here rather than composed from a `render('badges')` seam because the badges have to stay on
   * ONE source line: Obsidian renders markdown with `breaks: true`, and each partial would end in the
   * newline that turns into a `<br>` between two badges.
   */
  public addBadge(markdown: string): this {
    this._badges.push(markdown);
    return this;
  }

  /**
   * Registers a declared package that depcheck reports as unused although it is not -- one only ever
   * invoked as a CLI, named as a string in a config, or reached by a compiler option.
   *
   * Called beside the `addPackage` that declares it, so an ignore exists exactly when its package does.
   * Collected here rather than concatenated from template partials for the same reason as
   * {@link addLintStagedCommand}: a partial can only emit `'<name>',`, and the last trailing comma is
   * invalid JSON. The reason is kept because the emitted file records one per entry: once the file
   * exists, a dependency sweep treats anything depcheck still reports as a failure, so an entry without
   * its reason is a false positive nobody can re-verify.
   */
  public addDepcheckIgnore(packageName: string, reason: string): this {
    this._depcheckIgnores.set(packageName, reason);
    return this;
  }

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
    if (!PARTIAL_NAME_PATTERN.test(name)) {
      throw new Error(`Partial name "${name}" is not kebab-case, so its template files would not be recognized as partials.`);
    }
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
