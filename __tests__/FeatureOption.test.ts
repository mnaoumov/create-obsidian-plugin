import {
  describe,
  expect,
  it
} from 'vitest';

import type { Answers } from '../src/Answers.ts';

import {
  FeatureOption,
  resolveFeature
} from '../src/FeatureOption.ts';
import { TemplateBuilder } from '../src/TemplateBuilder.ts';

class ConfiguringFeature extends FeatureOption {
  public constructor() {
    super({ promptHint: '', promptLabel: 'Configuring', settingValue: 'configuring' });
  }

  public override configure(builder: TemplateBuilder, _answers: Answers): void {
    builder.addPackage('test-pkg').addScript('test');
  }
}

class TestFeature extends FeatureOption {
  public constructor(value: string) {
    super({ promptHint: '', promptLabel: value, settingValue: value });
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
    const builder = new TemplateBuilder();
    const feature = new ConfiguringFeature();
    feature.configure(builder, {} as Answers);

    expect(builder.dependencies.some((d) => d.packageName === 'test-pkg')).toBe(true);
    expect(builder.scripts['test']).toBe('jiti scripts/test.ts');
  });
});
