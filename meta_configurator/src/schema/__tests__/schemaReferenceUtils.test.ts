import {describe, expect, it} from 'vitest';
import {
  collectAllRefs,
  resolveInternalReferencePath,
  resolveInternalReferenceSchema,
} from '@/schema/schemaReferenceUtils';
import type {JsonSchemaType} from '@/schema/jsonSchemaType';

describe('collectAllRefs', () => {
  it('collects refs from all nesting levels of a schema', () => {
    const schema: JsonSchemaType = {
      type: 'object',
      properties: {
        status: {$ref: '#/$defs/Status'},
        habitats: {
          type: 'array',
          items: {$ref: '#/$defs/Habitat'},
        },
      },
      allOf: [{$ref: '#/$defs/Base'}],
      $defs: {
        Nested: {
          properties: {
            inner: {$ref: '#/$defs/Inner'},
          },
        },
      },
    };

    expect(collectAllRefs(schema).sort()).toEqual([
      '#/$defs/Base',
      '#/$defs/Habitat',
      '#/$defs/Inner',
      '#/$defs/Status',
    ]);
  });

  it('returns each ref only once', () => {
    const schema = {
      properties: {
        a: {$ref: '#/$defs/Shared'},
        b: {$ref: '#/$defs/Shared'},
      },
    };

    expect(collectAllRefs(schema)).toEqual(['#/$defs/Shared']);
  });

  it('returns an empty array for schemas without refs', () => {
    expect(collectAllRefs({type: 'string'})).toEqual([]);
    expect(collectAllRefs(true)).toEqual([]);
  });
});

describe('resolveInternalReferencePath', () => {
  it('resolves an internal reference to a path', () => {
    expect(resolveInternalReferencePath('#/$defs/Status')).toEqual(['$defs', 'Status']);
  });

  it('returns undefined for external references', () => {
    expect(resolveInternalReferencePath('https://example.com/schema.json')).toBeUndefined();
  });
});

describe('resolveInternalReferenceSchema', () => {
  const rootSchema = {
    $defs: {
      Status: {type: 'string'},
    },
  };

  it('resolves an internal reference to its schema', () => {
    expect(resolveInternalReferenceSchema('#/$defs/Status', rootSchema)).toEqual({type: 'string'});
  });

  it('returns undefined when the referenced schema does not exist', () => {
    expect(resolveInternalReferenceSchema('#/$defs/Missing', rootSchema)).toBeUndefined();
  });
});
