import { describe, expect, it } from 'vitest';

import type { Answers } from '../src/Answers.ts';
import { FeatureOption, resolveFeature } from '../src/FeatureContribution.ts';
import type { TemplateBuilder } from '../src/TemplateBuilder.ts';

class TestFeature extends FeatureOption {
  constructor(value: string) {
    super({ settingValue: value, promptLabel: value, promptHint: '' });
  }
}

class ConfiguringFeature extends FeatureOption {
  constructor() {
    super({ settingValue: 'configuring', promptLabel: 'Configuring', promptHint: '' });
  }

  override configure(builder: TemplateBuilder, _answers: Answers): void {
    builder.addPackage('test-pkg').addScript('test');
  }
}

describe('FeatureOption', () => {
  it('stores config properties', () => {
    const feature = new TestFeature('my-value');
    expect(feature.settingValue).toBe('my-value');
    expect(feature.promptLabel).toBe('my-value');
  });

  it('configure is a no-op by default', () => {
    const feature = new TestFeature('noop');
    // Should not throw
    expect(() => {
      feature.configure({} as TemplateBuilder, {} as Answers);
    }).not.toThrow();
  });
});

describe('resolveFeature', () => {
  const options = [new TestFeature('alpha'), new TestFeature('beta'), new TestFeature('gamma')] as const;

  it('finds a feature by settingValue', () => {
    expect(resolveFeature(options, 'beta')).toBe(options[1]);
  });

  it('throws for unknown value', () => {
    expect(() => resolveFeature(options, 'unknown')).toThrow('Unknown feature value: unknown');
  });
});

describe('Feature configure integration', () => {
  it('feature can add packages and scripts to builder', () => {
    const { TemplateBuilder: RealBuilder } = require('../src/TemplateBuilder.ts') as typeof import('../src/TemplateBuilder.ts');
    const builder = new RealBuilder();
    const feature = new ConfiguringFeature();
    feature.configure(builder, {} as Answers);

    expect(builder.dependencies.some((d) => d.packageName === 'test-pkg')).toBe(true);
    expect(builder.scripts['test']).toBe('jiti scripts/test.ts');
  });
});
