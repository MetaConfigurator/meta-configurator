import {describe, expect, it} from 'vitest';
import {assertSafeJavascriptTransformSource} from '@/utility/sandboxedJavascript';

describe('sandboxed JavaScript source validation', () => {
  it('accepts a regular transform function', () => {
    expect(() =>
      assertSafeJavascriptTransformSource(`function transform(input) {
        return {name: input.name, values: input.values?.map(value => value * 2) ?? []};
      }`)
    ).not.toThrow();
  });

  it.each([
    [
      'module imports',
      `async function transform(input) { return import('https://example.com/x.js'); }`,
    ],
    ['CommonJS imports', `function transform(input) { return require('package')(input); }`],
    ['dynamic code evaluation', `function transform(input) { return eval(input); }`],
    [
      'constructor-based code evaluation',
      `function transform(input) { return (() => {}).constructor(input)(); }`,
    ],
  ])('rejects %s', (_description, source) => {
    expect(() => assertSafeJavascriptTransformSource(source)).toThrow(
      'External access and dynamic code are disabled.'
    );
  });

  it('rejects an empty transform', () => {
    expect(() => assertSafeJavascriptTransformSource('   ')).toThrow(
      'JavaScript mapping must not be empty.'
    );
  });
});
