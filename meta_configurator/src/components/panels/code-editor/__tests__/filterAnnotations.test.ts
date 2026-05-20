import {describe, expect, it} from 'vitest';
import type {ErrorObject} from 'ajv';
import {filterOutAncestorErrors} from '@/components/panels/code-editor/filterAnnotations';
import {ValidationService} from '@/schema/validationService';
import featureTestingSchema from '@/utility/documentation/__tests__/samples/featureTesting.schema.json';

function err(
  instancePath: string,
  options: {keyword?: string; params?: Record<string, unknown>; message?: string} = {}
): ErrorObject {
  return {
    instancePath,
    schemaPath: '#' + instancePath,
    keyword: options.keyword ?? 'type',
    params: options.params ?? {},
    message: options.message ?? 'invalid',
  } as ErrorObject;
}

describe('filterOutAncestorErrors', () => {
  it('drops a composite parent error when a child error exists', () => {
    const errors = [
      err('', {keyword: 'oneOf'}),
      err('/foo', {keyword: 'allOf'}),
      err('/foo/bar', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath)).toEqual(['/foo/bar']);
  });

  it('keeps sibling leaf errors', () => {
    const errors = [err('/foo/bar'), err('/foo/baz')];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath)).toEqual(['/foo/bar', '/foo/baz']);
  });

  it('keeps required errors at a parent path (their target slot is empty in the data)', () => {
    // The required error refers to a property the data does not contain, so the annotation
    // legitimately sits at the enclosing object's path. The filter must not treat such an
    // error as a redundant "parent summary" of unrelated sibling errors.
    const errors = [
      err('', {keyword: 'required', params: {missingProperty: 'name'}}),
      err('', {keyword: 'required', params: {missingProperty: 'firstName'}}),
      err('/heightInMeter', {keyword: 'maximum'}),
      err('/address/zipCode', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => ({path: e.instancePath, keyword: e.keyword}))).toEqual([
      {path: '', keyword: 'required'},
      {path: '', keyword: 'required'},
      {path: '/heightInMeter', keyword: 'maximum'},
      {path: '/address/zipCode', keyword: 'type'},
    ]);
  });

  it('drops a required error when another error targets the same missing property', () => {
    // contrived: a required error pointing at /foo/bar and a real validation error at /foo/bar.
    // The required-pointer is the same effective leaf, so it should not push the real one out
    // (errors at the same path are both kept).
    const errors = [
      err('/foo', {keyword: 'required', params: {missingProperty: 'bar'}}),
      err('/foo/bar', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    // both share the effective leaf path /foo/bar; neither is a strict ancestor of the other
    expect(result).toHaveLength(2);
  });

  it('drops additionalProperties parent error when there is a deeper error in the extra prop', () => {
    const errors = [
      err('', {keyword: 'additionalProperties', params: {additionalProperty: 'extra'}}),
      err('/extra/inner', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath)).toEqual(['/extra/inner']);
  });

  it('keeps a lone parent error when no descendant exists', () => {
    const errors = [err('/foo', {keyword: 'required', params: {missingProperty: 'bar'}})];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath)).toEqual(['/foo']);
  });

  it('keeps multiple errors at the same path', () => {
    const errors = [err('/foo', {keyword: 'type'}), err('/foo', {keyword: 'pattern'})];

    const result = filterOutAncestorErrors(errors);

    expect(result).toHaveLength(2);
    expect(result.every(e => e.instancePath === '/foo')).toBe(true);
  });

  it('treats path segments correctly (/foo is not an ancestor of /foobar)', () => {
    const errors = [err('/foo'), err('/foobar')];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath).sort()).toEqual(['/foo', '/foobar']);
  });

  it('collapses long ancestor chains down to the deepest descendant', () => {
    const errors = [
      err('', {keyword: 'oneOf'}),
      err('/a', {keyword: 'oneOf'}),
      err('/a/b', {keyword: 'oneOf'}),
      err('/a/b/c', {keyword: 'oneOf'}),
      err('/a/b/c/d', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath)).toEqual(['/a/b/c/d']);
  });

  it('handles array index paths', () => {
    const errors = [
      err('/items', {keyword: 'allOf'}),
      err('/items/0', {keyword: 'allOf'}),
      err('/items/0/name', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    expect(result.map(e => e.instancePath)).toEqual(['/items/0/name']);
  });

  it('escapes property names containing / or ~ before treating them as path segments', () => {
    // a required error for property "a/b" expands to effective path "/foo/a~1b", which
    // must not match "/foo/a/b" or be matched-against incorrectly.
    const errors = [
      err('/foo', {keyword: 'required', params: {missingProperty: 'a/b'}}),
      err('/foo/a/b', {keyword: 'type'}),
    ];

    const result = filterOutAncestorErrors(errors);

    // The required error's effective path is /foo/a~1b, the other is /foo/a/b — they
    // are siblings, so both survive.
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when input is empty', () => {
    expect(filterOutAncestorErrors([])).toEqual([]);
  });

  // Integration scenario from issue #741: validates the user's data against the
  // feature-testing schema and confirms the filter preserves the per-property errors.
  it('on the feature-testing schema, keeps required-at-root, heightInMeter, and zipCode errors', () => {
    const service = new ValidationService(featureTestingSchema as any);
    const result = service.validate({
      heightInMeter: 9.24,
      telephoneNumber: 159,
      isMarried: true,
      address: {zipCode: 4},
    });

    const filtered = filterOutAncestorErrors(result.errors);
    const summary = filtered.map(e => ({path: e.instancePath, keyword: e.keyword}));

    expect(summary).toEqual(
      expect.arrayContaining([
        {
          path: '',
          keyword: 'required',
        },
        {
          path: '/heightInMeter',
          keyword: 'maximum',
        },
        {
          path: '/address/zipCode',
          keyword: 'type',
        },
      ])
    );

    // both required errors (name + firstName) survive even though /heightInMeter has its own error
    const requiredErrors = filtered.filter(e => e.keyword === 'required');
    expect(requiredErrors).toHaveLength(2);
    expect(
      requiredErrors.map(e => (e.params as {missingProperty: string}).missingProperty).sort()
    ).toEqual(['firstName', 'name']);
  });
});
