import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import { join } from 'node:path';

import type { Answers } from './answers.ts';
import type { TemplateBuilder } from './template-builder.ts';

import { describeCase } from './answer-space.ts';
import {
  buildTemplate,
  getDestinationPath,
  getScriptDir
} from './templates.ts';

/** What one case's plan came to: what is wrong with it, and the dependency set it declared. */
export interface CaseCheckResult {
  /** `null` when the plan could not be built at all, so the case declares no dependency set. */
  dependencySignature: null | string;
  violations: PlanViolation[];
}

/** One partial file on disk, parsed into the three things the composition system keys it on. */
export interface PartialFile {
  /** The template this partial contributes to -- itself a partial path when the composition is nested. */
  basePath: string;
  /** The partial name a case has to contribute for this file to be included. */
  partialName: string;
  /** Path relative to the templates directory, `.ejs` included. */
  path: string;
  /** The `render(section)` this file answers, or `null` for the whole-file form. */
  section: null | string;
}

/** What a plan-level check found, in a form a sweep can print without re-deriving anything. */
export interface PlanViolation {
  detail: string;
  kind: PlanViolationKind;
  subject: string;
}

/**
 * The distinct plan-level defects, each one a way to ship a silently-wrong project.
 *
 * `empty-emitted-file` is the per-case one and the highest-value: an unresolved partial renders as `''`
 * rather than failing, so the destination is written empty and `tsc` accepts it. The rest are repo-level
 * -- a partial or a render section no answer can ever reach is dead whatever the case.
 */
export type PlanViolationKind =
  | 'dead-partial-base'
  | 'duplicate-destination'
  | 'empty-emitted-file'
  | 'missing-script-file'
  | 'orphan-partial'
  | 'plan-threw'
  | 'unreachable-render-section';

/** One `<%- render(...) %>` call site, and the template whose partials it composes. */
export interface RenderSite {
  basePath: string;
  section: string;
}

/** Everything the checks need to know about `templates/default`, read from disk once. */
export interface TemplateInventory {
  /** Registered paths that have their own `.ejs` and so are not composed from partials. */
  directTemplates: Set<string>;
  /** Direct templates whose `.ejs` is byte-empty, which no case can render into anything. */
  emptyTemplates: Set<string>;
  partials: PartialFile[];
  renderSites: RenderSite[];
  /**
   * Whole-file partial names, indexed by the file they compose.
   *
   * The per-case check asks "which partials could fill this file?" once per registered file, and the
   * sweep runs it billions of times. Scanning all 242 partials per question made that ~15,000 string
   * comparisons per case and dominated the tier's whole cost; this index makes it a map lookup.
   */
  wholeFilePartialsByBase: Map<string, string[]>;
}

/**
 * What a set of cases was actually seen to register, accumulated across a sweep.
 *
 * The repo-level checks are only as sound as this is complete: run against the exhaustive sweep it
 * proves a partial is unreachable, run against a covering array it proves nothing in the covering array
 * reached it. {@link checkUsage} is the same code either way; the caller owns the claim.
 */
export interface TemplateUsage {
  partialNames: Set<string>;
  registeredPaths: Set<string>;
}

const EJS_SUFFIX = '.ejs';

/** The `addScript` default command shape, whose tail is the `scripts/<name>.ts` the script needs. */
const JITI_SCRIPT_PREFIX = 'jiti scripts/';

/** Matches the `<%- render(...) %>` form only, so `render(null, this.contentEl)` in emitted code is not one. */
const RENDER_SITE_PATTERN = /<%[-=]?\s*render\(\s*(?:'(?<Section>[^']*)'|\{(?<Options>[^}]*)\})/g;

const SECTION_OPTION_PATTERN = /section\s*:\s*'(?<Section>[^']*)'/;

/**
 * Builds one case's plan and checks it, recording what it declared and folding a crash into the result.
 *
 * Building is inside the check because `configure` can throw on a perfectly legal combination -- `wasm`
 * with a bundler the plugin table has no entry for did, for a fifth of the bundler answers -- and a
 * sweep that lets the first such case take the process down reports one defect instead of all of them.
 */
export function checkCase(answers: Answers, inventory: TemplateInventory, usage?: TemplateUsage): CaseCheckResult {
  let builder: TemplateBuilder;
  try {
    builder = buildTemplate(answers);
  } catch (error: unknown) {
    return {
      dependencySignature: null,
      violations: [{
        detail: error instanceof Error ? error.message : String(error),
        kind: 'plan-threw',
        subject: describeCase(answers)
      }]
    };
  }

  if (usage) {
    collectUsage(builder, usage);
  }

  return {
    dependencySignature: dependencySignature(builder),
    violations: checkPlan(builder, answers, inventory)
  };
}

/**
 * Checks an already-built plan for the defects decidable without rendering it.
 *
 * Pure and cheap by construction -- no file is written and the inventory is read once for the whole
 * sweep -- which is what lets this tier cover the entire answer space rather than a sample of it.
 */
export function checkPlan(builder: TemplateBuilder, answers: Answers, inventory: TemplateInventory): PlanViolation[] {
  const violations: PlanViolation[] = [];
  // Each of these getters copies (and `scripts` sorts) on every access, so they are read exactly once.
  // At the scale this tier runs at, reading `templateFiles` twice is measurable on its own.
  const partials = builder.partials;
  const files = builder.templateFiles;
  const emitted: string[] = [];
  let anySubstitution = false;

  for (const registeredPath of files) {
    if (isPartialPath(registeredPath)) {
      continue;
    }

    emitted.push(registeredPath);
    anySubstitution ||= registeredPath.includes('%');

    const emptyReason = findEmptyReason(registeredPath, partials, inventory);
    if (emptyReason !== null) {
      violations.push({
        detail: emptyReason,
        kind: 'empty-emitted-file',
        subject: registeredPath
      });
    }
  }

  // `templateFiles` is a Set, so paths that pass through unchanged are already distinct -- only an
  // Answer substitution can make two of them land on one destination. Nothing registers a `%=` path
  // Today, so this whole pass is skipped, which matters at billions of cases.
  if (anySubstitution) {
    violations.push(...checkDestinations(emitted, answers));
  }

  violations.push(...checkScriptFiles(builder.scripts, files));
  return violations;
}

/**
 * Checks the template tree against what a sweep was seen to register.
 *
 * Every finding here says the same thing in a different place: a file exists that no answer can reach,
 * so whatever it was meant to contribute is silently absent from every generated project.
 */
export function checkUsage(usage: TemplateUsage, inventory: TemplateInventory): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const partialPaths = new Set(inventory.partials.map((partial) => partial.path.slice(0, -EJS_SUFFIX.length)));

  for (const partial of inventory.partials) {
    if (!usage.partialNames.has(partial.partialName)) {
      violations.push({
        detail: `No answer contributes the partial "${partial.partialName}", so this file is never included.`,
        kind: 'orphan-partial',
        subject: partial.path
      });
    }
    if (!usage.registeredPaths.has(partial.basePath) && !partialPaths.has(partial.basePath)) {
      violations.push({
        detail: `Its base "${partial.basePath}" is neither a registered file nor another partial.`,
        kind: 'dead-partial-base',
        subject: partial.path
      });
    }
  }

  violations.push(...checkRenderSites(usage, inventory));
  return violations;
}

/** Reads the sections a `<%- render(...) %>` site names, ignoring the no-section whole-file form. */
export function collectRenderSections(templateBody: string): string[] {
  const sections: string[] = [];
  for (const match of templateBody.matchAll(RENDER_SITE_PATTERN)) {
    const direct = match.groups?.['Section'];
    if (direct !== undefined) {
      sections.push(direct);
      continue;
    }
    const fromOptions = SECTION_OPTION_PATTERN.exec(match.groups?.['Options'] ?? '')?.groups?.['Section'];
    if (fromOptions !== undefined) {
      sections.push(fromOptions);
    }
  }
  return sections;
}

/** Records what one case registered, so the repo-level checks can be run over a whole sweep. */
export function collectUsage(builder: TemplateBuilder, usage: TemplateUsage): void {
  for (const partialName of builder.partials) {
    usage.partialNames.add(partialName);
  }
  for (const path of builder.templateFiles) {
    usage.registeredPaths.add(path);
  }
}

/**
 * Hashes the exact dependency set a case declares, name and spec together.
 *
 * The install tier groups cases by this: two cases that hash the same can share one `node_modules`, and
 * counting the distinct hashes over the whole space is what turns the "these nine questions look inert"
 * probe into a proven claim.
 */
export function dependencySignature(builder: TemplateBuilder): string {
  const declared = builder.dependencies.map((dependency) => `${dependency.packageName}@${dependency.version ?? '*'}`).join('\n');
  return createHash('sha256').update(declared).digest('hex');
}

/** Reads `templates/default` into the shape the checks query, walking it once. */
export function loadTemplateInventory(templatesDir: string = defaultTemplatesDir()): TemplateInventory {
  const directTemplates = new Set<string>();
  const emptyTemplates = new Set<string>();
  const partials: PartialFile[] = [];
  const renderSites: RenderSite[] = [];

  for (const relativePath of walkTemplates(templatesDir, '')) {
    if (!relativePath.endsWith(EJS_SUFFIX)) {
      continue;
    }

    const withoutSuffix = relativePath.slice(0, -EJS_SUFFIX.length);
    const body = readFileSync(join(templatesDir, relativePath), 'utf-8');

    if (isPartialPath(relativePath)) {
      partials.push(parsePartialPath(relativePath));
    } else {
      directTemplates.add(withoutSuffix);
      if (body.trim() === '') {
        emptyTemplates.add(withoutSuffix);
      }
    }

    for (const section of collectRenderSections(body)) {
      renderSites.push({ basePath: withoutSuffix, section });
    }
  }

  const wholeFilePartialsByBase = new Map<string, string[]>();
  for (const partial of partials) {
    if (partial.section !== null) {
      continue;
    }
    const names = wholeFilePartialsByBase.get(partial.basePath) ?? [];
    names.push(partial.partialName);
    wholeFilePartialsByBase.set(partial.basePath, names);
  }

  return {
    directTemplates,
    emptyTemplates,
    partials,
    renderSites,
    wholeFilePartialsByBase
  };
}

/** An empty usage record, to be filled by {@link collectUsage} as a sweep visits cases. */
export function newUsage(): TemplateUsage {
  return {
    partialNames: new Set<string>(),
    registeredPaths: new Set<string>()
  };
}

/**
 * Splits a partial path into base, section and partial name, reading right to left.
 *
 * Right to left because both the base and the section can themselves contain the separators: a nested
 * composition like `scripts/build.ts_standalone@bundler_esbuild.ejs` has `scripts/build.ts_standalone`
 * as its base. Partial names are `settingValue`s, which are kebab-case and never contain `_`, so the
 * last `_` always begins the partial name.
 */
export function parsePartialPath(relativePath: string): PartialFile {
  const withoutSuffix = relativePath.slice(0, -EJS_SUFFIX.length);
  const partialStart = withoutSuffix.lastIndexOf('_');
  const partialName = withoutSuffix.slice(partialStart + 1);
  const prefix = withoutSuffix.slice(0, partialStart);
  const sectionStart = prefix.lastIndexOf('@');

  if (sectionStart === -1) {
    return {
      basePath: prefix,
      partialName,
      path: relativePath,
      section: null
    };
  }

  return {
    basePath: prefix.slice(0, sectionStart),
    partialName,
    path: relativePath,
    section: prefix.slice(sectionStart + 1)
  };
}

/** Reports registered paths that resolve to one destination, so one silently overwrites the other. */
function checkDestinations(emitted: readonly string[], answers: Answers): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const claimants = new Map<string, string>();

  for (const registeredPath of emitted) {
    const destination = getDestinationPath(registeredPath, answers);
    const claimed = claimants.get(destination);
    if (claimed !== undefined) {
      violations.push({
        detail: `"${claimed}" and "${registeredPath}" both write it.`,
        kind: 'duplicate-destination',
        subject: destination
      });
      continue;
    }
    claimants.set(destination, registeredPath);
  }

  return violations;
}

/**
 * Checks each `render(section)` name against the partials that answer it, ignoring which file asks.
 *
 * Deliberately base-agnostic. `render()` resolves against `renderRoot`, which is set to the FIRST
 * matching partial of the enclosing composition and then held for every later partial in that same loop
 * -- so the base a nested `render` resolves against depends on partial insertion order, not on the file
 * the call sits in. Modelling that here would trade a real check for a source of false positives; a
 * section name that no reachable partial anywhere answers is dead whatever the base turns out to be, and
 * `orphan-partial` covers the per-file half.
 */
function checkRenderSites(usage: TemplateUsage, inventory: TemplateInventory): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const declared = new Set<string>();
  const reachable = new Set<string>();

  for (const partial of inventory.partials) {
    if (partial.section === null) {
      continue;
    }
    declared.add(partial.section);
    if (usage.partialNames.has(partial.partialName)) {
      reachable.add(partial.section);
    }
  }

  const reported = new Set<string>();
  for (const site of inventory.renderSites) {
    if (reachable.has(site.section) || reported.has(site.section)) {
      continue;
    }
    reported.add(site.section);
    violations.push({
      detail: declared.has(site.section)
        ? `Every partial answering it is unreachable, so it renders as nothing for every answer. Asked for by "${site.basePath}".`
        : `No partial file answers it at all, so it renders as nothing for every answer. Asked for by "${site.basePath}".`,
      kind: 'unreachable-render-section',
      subject: site.section
    });
  }

  return violations;
}

/**
 * Checks that every script following the `addScript` convention has its file registered.
 *
 * `addScript(name)` defaults the command to `jiti scripts/<name>.ts` without registering that file, so a
 * script and its file are two separate declarations that can drift apart -- and the result is a
 * `package.json` entry pointing at a path the generated project does not contain.
 */
function checkScriptFiles(scripts: Readonly<Record<string, string>>, files: ReadonlySet<string>): PlanViolation[] {
  const violations: PlanViolation[] = [];

  for (const [name, command] of Object.entries(scripts)) {
    // Prefix and suffix tests rather than a regex: this runs per script per case, and a regex here cost
    // More than every other check in this function put together.
    if (!command.startsWith(JITI_SCRIPT_PREFIX) || !command.endsWith('.ts')) {
      continue;
    }
    const scriptPath = command.slice(JITI_SCRIPT_PREFIX.length - 'scripts/'.length);
    if (!files.has(scriptPath)) {
      violations.push({
        detail: `Script "${name}" runs "${command}", but "${scriptPath}" is not a registered file.`,
        kind: 'missing-script-file',
        subject: name
      });
    }
  }

  return violations;
}

function defaultTemplatesDir(): string {
  return join(getScriptDir(), '..', 'templates', 'default');
}

/** Says why a registered file would be written empty, or `null` when something will fill it. */
function findEmptyReason(registeredPath: string, partials: ReadonlySet<string>, inventory: TemplateInventory): null | string {
  if (inventory.directTemplates.has(registeredPath)) {
    return inventory.emptyTemplates.has(registeredPath) ? 'Its own .ejs is empty.' : null;
  }

  const candidates = inventory.wholeFilePartialsByBase.get(registeredPath);
  if (candidates === undefined) {
    return 'It has neither its own .ejs nor any whole-file partial on disk.';
  }

  for (const partialName of candidates) {
    if (partials.has(partialName)) {
      return null;
    }
  }

  return `No contributed partial matches. On disk: ${[...candidates].sort((a, b) => a.localeCompare(b)).join(', ')}.`;
}

function isPartialPath(relativePath: string): boolean {
  return (relativePath.split('/').pop() ?? '').includes('_');
}

function walkTemplates(templatesDir: string, relativeDir: string): string[] {
  const absoluteDir = join(templatesDir, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const found: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const relativePath = relativeDir === '' ? entry : `${relativeDir}/${entry}`;
    if (statSync(join(templatesDir, relativePath)).isDirectory()) {
      found.push(...walkTemplates(templatesDir, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found;
}
