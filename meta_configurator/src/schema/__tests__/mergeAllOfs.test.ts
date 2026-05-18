import {describe, expect, it} from 'vitest';
import {areSchemasCompatible, mergeSchemas, safeMergeSchemas} from '@/schema/mergeAllOfs';

describe('mergeAllOfs', () => {
  it('treats schemas with only annotation conflicts as compatible', () => {
    const result = safeMergeSchemas(
      {
        title: 'Json schema',
        $comment: 'wrapper comment',
      },
      {
        title: 'Subschema',
        type: 'object',
        properties: {
          foo: {
            title: 'Foo',
            type: 'string',
          },
        },
      }
    );

    expect(result).not.toBe(false);
  });

  it('treats empty schema plus constrained schema as compatible', () => {
    expect(
      areSchemasCompatible(
        {},
        {
          type: 'object',
          conditions: [
            {
              if: {
                anyOf: [{properties: {type: {const: 'string'}}}],
              },
              then: {
                properties: {
                  pattern: {
                    type: 'string',
                    pattern: '^[A-Za-z_][-A-Za-z0-9._]*$',
                  },
                },
              },
            },
          ],
        }
      )
    ).toBe(true);
  });

  it('treats a single schema with an unsatisfiable internal allOf as incompatible', () => {
    // After convertConstToEnum normalizes `const: 'null'` into `enum: ['null']`,
    // the merger can no longer reconcile the two `contains` keywords. This is a
    // real incompatibility and must propagate from areSchemasCompatible so the
    // caller drops the option before it reaches handleAllOfs.
    expect(
      areSchemasCompatible(
        {},
        {
          type: 'array',
          allOf: [
            {contains: {enum: ['null']}},
            {contains: {enum: ['array', 'boolean', 'integer', 'number', 'object', 'string']}},
          ],
        }
      )
    ).toBe(false);
  });

  it('falls back to a stripped merge only when necessary', () => {
    const result = mergeSchemas(
      {
        title: 'Json schema',
        $comment: 'wrapper comment',
      },
      {
        title: 'Subschema',
        type: 'object',
        properties: {
          foo: {
            title: 'Foo',
            type: 'string',
          },
        },
      }
    ) as any;

    expect(result.type).toBe('object');
    expect(result.properties.foo.type).toBe('string');
    expect(result.title).toBe('Json schema');
  });
});
