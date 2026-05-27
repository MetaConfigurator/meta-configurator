import {describe, expect, it} from 'vitest';
import type {ErrorObject} from 'ajv';
import {collapseUnionErrors} from '@/schema/collapseUnionErrors';
import {ValidationService} from '@/schema/validationService';
import {buildFullMetaSchema} from '@/schema/metaSchemaBuilder';

function err(overrides: Partial<ErrorObject>): ErrorObject {
  return {
    instancePath: '',
    schemaPath: '#',
    keyword: 'type',
    params: {},
    message: 'invalid',
    ...overrides,
  } as ErrorObject;
}

describe('collapseUnionErrors', () => {
  it('collapses a oneOf cluster into a single enriched error', () => {
    const errors = [
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf/0/maximum',
        keyword: 'maximum',
        message: 'must be <= 10',
      }),
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf/1/type',
        keyword: 'type',
        message: 'must be string',
      }),
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf',
        keyword: 'oneOf',
        message: 'must match exactly one schema in oneOf',
      }),
    ];

    const result = collapseUnionErrors(errors);

    expect(result).toHaveLength(1);
    expect(result[0]!.keyword).toBe('oneOf');
    expect(result[0]!.instancePath).toBe('/a');
    expect(result[0]!.message).toBe(
      [
        'does not match any oneOf variant:',
        '  • variant 1: must be <= 10',
        '  • variant 2: must be string',
      ].join('\n')
    );
  });

  it('collapses anyOf clusters the same way', () => {
    const errors = [
      err({
        schemaPath: '#/anyOf/0/type',
        keyword: 'type',
        message: 'must be number',
      }),
      err({
        schemaPath: '#/anyOf/1/type',
        keyword: 'type',
        message: 'must be boolean',
      }),
      err({
        schemaPath: '#/anyOf',
        keyword: 'anyOf',
        message: 'must match a schema in anyOf',
      }),
    ];

    const result = collapseUnionErrors(errors);

    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe(
      [
        'does not match any anyOf variant:',
        '  • variant 1: must be number',
        '  • variant 2: must be boolean',
      ].join('\n')
    );
  });

  it('groups multiple sub-errors per branch into one variant line', () => {
    const errors = [
      err({
        schemaPath: '#/oneOf/0/type',
        keyword: 'type',
        message: 'must be string',
      }),
      err({
        schemaPath: '#/oneOf/0/minLength',
        keyword: 'minLength',
        message: 'must be at least 3 characters',
      }),
      err({
        schemaPath: '#/oneOf',
        keyword: 'oneOf',
        message: 'must match exactly one schema in oneOf',
      }),
    ];

    const result = collapseUnionErrors(errors);

    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe(
      [
        'does not match any oneOf variant:',
        '  • variant 1: must be string; must be at least 3 characters',
      ].join('\n')
    );
  });

  it('handles multiple sibling oneOf clusters independently', () => {
    const errors = [
      // cluster at /a
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf/0/type',
        keyword: 'type',
        message: 'must be string',
      }),
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf',
        keyword: 'oneOf',
      }),
      // cluster at /b
      err({
        instancePath: '/b',
        schemaPath: '#/properties/b/oneOf/0/type',
        keyword: 'type',
        message: 'must be number',
      }),
      err({
        instancePath: '/b',
        schemaPath: '#/properties/b/oneOf',
        keyword: 'oneOf',
      }),
    ];

    const result = collapseUnionErrors(errors);

    expect(result).toHaveLength(2);
    expect(result[0]!.instancePath).toBe('/a');
    expect(result[1]!.instancePath).toBe('/b');
    expect(result[0]!.message).toContain('must be string');
    expect(result[1]!.message).toContain('must be number');
  });

  it('preserves the summary unchanged if it has no matching branch sub-errors', () => {
    const errors = [
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf',
        keyword: 'oneOf',
        message: 'must match exactly one schema in oneOf',
      }),
    ];

    const result = collapseUnionErrors(errors);

    expect(result).toEqual(errors);
  });

  it('passes unrelated errors through untouched', () => {
    const errors = [
      err({instancePath: '/x', keyword: 'type', schemaPath: '#/properties/x/type'}),
      err({instancePath: '/y', keyword: 'maximum', schemaPath: '#/properties/y/maximum'}),
    ];

    const result = collapseUnionErrors(errors);

    expect(result).toEqual(errors);
  });

  it('is idempotent', () => {
    const errors = [
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf/0/maximum',
        keyword: 'maximum',
      }),
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf/1/type',
        keyword: 'type',
      }),
      err({
        instancePath: '/a',
        schemaPath: '#/properties/a/oneOf',
        keyword: 'oneOf',
      }),
    ];

    const once = collapseUnionErrors(errors);
    const twice = collapseUnionErrors(once);

    expect(twice).toEqual(once);
  });

  it('returns an empty array unchanged', () => {
    expect(collapseUnionErrors([])).toEqual([]);
  });

  it('collapses nested unions (oneOf in oneOf in anyOf) into a single tree-shaped error', () => {
    const service = new ValidationService({
      type: 'object',
      properties: {
        a: {
          anyOf: [
            {
              oneOf: [
                {
                  oneOf: [
                    {type: 'integer', maximum: 5},
                    {type: 'string', minLength: 3},
                  ],
                },
                {type: 'boolean'},
              ],
            },
            {type: 'null'},
          ],
        },
      },
    } as any);

    const raw = service.validate({a: 100}).errors;
    const collapsed = collapseUnionErrors(raw);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]!.instancePath).toBe('/a');
    expect(collapsed[0]!.keyword).toBe('anyOf');
    expect(collapsed[0]!.message).toBe(
      [
        'does not match any anyOf variant:',
        '  • variant 1: does not match any oneOf variant:',
        '    • variant 1.1: does not match any oneOf variant:',
        '      • variant 1.1.1: must be <= 5',
        '      • variant 1.1.2: must be string',
        '    • variant 1.2: must be boolean',
        '  • variant 2: must be null',
      ].join('\n')
    );
  });

  // integration: run real AJV against the schema/data from the issue discussion
  it("produces a single annotation for the user's oneOf example", () => {
    const service = new ValidationService({
      type: 'object',
      properties: {
        a: {
          oneOf: [
            {type: 'integer', maximum: 10},
            {type: 'string', maxLength: 4},
          ],
        },
      },
    } as any);

    // ValidationService doesn't currently apply the collapse itself — call it explicitly
    const raw = service.validate({a: 345}).errors;
    const collapsed = collapseUnionErrors(raw);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]!.instancePath).toBe('/a');
    expect(collapsed[0]!.keyword).toBe('oneOf');
    expect(collapsed[0]!.message).toBe(
      [
        'does not match any oneOf variant:',
        '  • variant 1: must be <= 10',
        '  • variant 2: must be string',
      ].join('\n')
    );
  });

  it('includes referenced oneOf branch errors when additionalProperties is an invalid schema value', () => {
    const service = new ValidationService(buildFullMetaSchema());

    const raw = service.validate({type: 'object', additionalProperties: 1}).errors;
    const collapsed = collapseUnionErrors(raw);

    const additionalPropertiesError = collapsed.find(
      error => error.instancePath === '/additionalProperties'
    );

    expect(additionalPropertiesError).toBeDefined();
    expect(additionalPropertiesError!.keyword).toBe('oneOf');
    expect(additionalPropertiesError!.message).toContain('variant 1');
    expect(additionalPropertiesError!.message).toContain('variant 2');
    expect(additionalPropertiesError!.message).toContain('variant 3');
    expect(additionalPropertiesError!.message).toContain('must be object');
    expect(collapsed.filter(error => error.instancePath === '/additionalProperties')).toHaveLength(
      1
    );
  });
});
