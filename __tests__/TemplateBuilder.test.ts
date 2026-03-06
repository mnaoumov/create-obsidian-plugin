import { describe, expect, it } from 'vitest';

import { Dependency, TemplateBuilder } from '../src/TemplateBuilder.ts';

describe('Dependency', () => {
  it('defaults version to latest', () => {
    const dep = new Dependency('foo');
    expect(dep.packageName).toBe('foo');
    expect(dep.version).toBe('latest');
  });

  it('accepts explicit version', () => {
    const dep = new Dependency('foo', '1.2.3');
    expect(dep.version).toBe('1.2.3');
  });
});

describe('TemplateBuilder', () => {
  describe('addPackage', () => {
    it('adds a dependency', () => {
      const builder = new TemplateBuilder();
      builder.addPackage('foo');
      expect(builder.dependencies).toEqual([new Dependency('foo')]);
    });

    it('deduplicates by package name, last one wins', () => {
      const builder = new TemplateBuilder();
      builder.addPackage('foo', '1.0.0');
      builder.addPackage('foo', '2.0.0');
      expect(builder.dependencies).toHaveLength(1);
      expect(builder.dependencies[0]!.version).toBe('2.0.0');
    });

    it('sorts dependencies alphabetically', () => {
      const builder = new TemplateBuilder();
      builder.addPackage('zlib');
      builder.addPackage('alpha');
      builder.addPackage('middle');
      expect(builder.dependencies.map((d) => d.packageName)).toEqual(['alpha', 'middle', 'zlib']);
    });

    it('is chainable', () => {
      const builder = new TemplateBuilder();
      const result = builder.addPackage('foo');
      expect(result).toBe(builder);
    });
  });

  describe('addFiles', () => {
    it('adds files to templateFiles', () => {
      const builder = new TemplateBuilder();
      builder.addFiles(['a.ts', 'b.ts']);
      expect([...builder.templateFiles]).toEqual(['a.ts', 'b.ts']);
    });

    it('deduplicates files', () => {
      const builder = new TemplateBuilder();
      builder.addFiles(['a.ts']);
      builder.addFiles(['a.ts', 'b.ts']);
      expect([...builder.templateFiles]).toEqual(['a.ts', 'b.ts']);
    });

    it('is chainable', () => {
      const builder = new TemplateBuilder();
      const result = builder.addFiles(['a.ts']);
      expect(result).toBe(builder);
    });
  });

  describe('addPartial', () => {
    it('adds a partial name', () => {
      const builder = new TemplateBuilder();
      builder.addPartial('svelte');
      expect(builder.partials.has('svelte')).toBe(true);
    });

    it('deduplicates partials', () => {
      const builder = new TemplateBuilder();
      builder.addPartial('svelte');
      builder.addPartial('svelte');
      expect(builder.partials.size).toBe(1);
    });

    it('is chainable', () => {
      const builder = new TemplateBuilder();
      const result = builder.addPartial('foo');
      expect(result).toBe(builder);
    });
  });

  describe('addScript', () => {
    it('generates default command from name', () => {
      const builder = new TemplateBuilder();
      builder.addScript('test:e2e');
      expect(builder.scripts['test:e2e']).toBe('jiti scripts/test-e2e.ts');
    });

    it('replaces colons with hyphens in default command', () => {
      const builder = new TemplateBuilder();
      builder.addScript('lint:md:fix');
      expect(builder.scripts['lint:md:fix']).toBe('jiti scripts/lint-md-fix.ts');
    });

    it('handles simple names without colons', () => {
      const builder = new TemplateBuilder();
      builder.addScript('build');
      expect(builder.scripts['build']).toBe('jiti scripts/build.ts');
    });

    it('accepts explicit command override', () => {
      const builder = new TemplateBuilder();
      builder.addScript('custom', 'node custom.js');
      expect(builder.scripts['custom']).toBe('node custom.js');
    });

    it('is chainable', () => {
      const builder = new TemplateBuilder();
      const result = builder.addScript('test');
      expect(result).toBe(builder);
    });
  });

  describe('getters return copies', () => {
    it('templateFiles returns a new Set', () => {
      const builder = new TemplateBuilder();
      builder.addFiles(['a.ts']);
      const files1 = builder.templateFiles;
      const files2 = builder.templateFiles;
      expect(files1).not.toBe(files2);
      expect(files1).toEqual(files2);
    });

    it('partials returns a new Set', () => {
      const builder = new TemplateBuilder();
      builder.addPartial('foo');
      const p1 = builder.partials;
      const p2 = builder.partials;
      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
    });

    it('scripts returns a new object', () => {
      const builder = new TemplateBuilder();
      builder.addScript('test');
      const s1 = builder.scripts;
      const s2 = builder.scripts;
      expect(s1).not.toBe(s2);
      expect(s1).toEqual(s2);
    });

    it('dependencies returns a new array', () => {
      const builder = new TemplateBuilder();
      builder.addPackage('foo');
      const d1 = builder.dependencies;
      const d2 = builder.dependencies;
      expect(d1).not.toBe(d2);
      expect(d1).toEqual(d2);
    });
  });
});
