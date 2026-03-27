import {describe, expect, it, vi} from 'vitest';
import {detectSchemaFeatures} from '@/schema/detectSchemaFeatures';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('detectSchemaFeatures', () => {
  it('detects no features in a minimal schema', () => {
    const schema: TopLevelSchema = {type: 'object'};
    const features = detectSchemaFeatures(schema);

    expect(features.composition).toBe(false);
    expect(features.conditionals).toBe(false);
    expect(features.defaultValues).toBe(false);
    expect(features.exampleValues).toBe(false);
    expect(features.enums).toBe(false);
    expect(features.constants).toBe(false);
    expect(features.multipleTypes).toBe(false);
    expect(features.references).toBe(false);
    expect(features.required).toBe(false);
    expect(features.negation).toBe(false);
    expect(features.booleanSchemas).toBe(false);
    expect(features.descriptions).toBe(false);
    expect(features.titles).toBe(false);
    expect(features.externalReferences).toBe(false);
  });

  it('detects composition (allOf/anyOf/oneOf)', () => {
    expect(detectSchemaFeatures({allOf: [{type: 'string'}]}).composition).toBe(true);
    expect(detectSchemaFeatures({anyOf: [{type: 'string'}]}).composition).toBe(true);
    expect(detectSchemaFeatures({oneOf: [{type: 'string'}, {type: 'number'}]}).composition).toBe(
      true
    );
  });

  it('detects conditionals (if/then/else)', () => {
    expect(detectSchemaFeatures({if: {type: 'string'}, then: {minLength: 1}}).conditionals).toBe(
      true
    );
    expect(detectSchemaFeatures({then: {minLength: 1}}).conditionals).toBe(true);
    expect(detectSchemaFeatures({else: true}).conditionals).toBe(true);
  });

  it('detects default values including falsy ones', () => {
    expect(detectSchemaFeatures({default: 'hello'}).defaultValues).toBe(true);
    expect(detectSchemaFeatures({default: 0}).defaultValues).toBe(true);
    expect(detectSchemaFeatures({default: false}).defaultValues).toBe(true);
    expect(detectSchemaFeatures({default: null}).defaultValues).toBe(true);
    expect(detectSchemaFeatures({default: ''}).defaultValues).toBe(true);
  });

  it('detects example values', () => {
    expect(detectSchemaFeatures({examples: ['foo']}).exampleValues).toBe(true);
  });

  it('detects enums', () => {
    expect(detectSchemaFeatures({enum: ['a', 'b']}).enums).toBe(true);
  });

  it('detects constants including falsy ones', () => {
    expect(detectSchemaFeatures({const: 'foo'}).constants).toBe(true);
    expect(detectSchemaFeatures({const: 0}).constants).toBe(true);
    expect(detectSchemaFeatures({const: false}).constants).toBe(true);
    expect(detectSchemaFeatures({const: null}).constants).toBe(true);
  });

  it('detects multiple types', () => {
    expect(detectSchemaFeatures({type: ['string', 'null']}).multipleTypes).toBe(true);
    expect(detectSchemaFeatures({type: 'string'}).multipleTypes).toBe(false);
  });

  it('detects $ref references', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        foo: {$ref: '#/$defs/bar'},
      },
      $defs: {bar: {type: 'string'}},
    };
    expect(detectSchemaFeatures(schema).references).toBe(true);
    expect(detectSchemaFeatures(schema).externalReferences).toBe(false);
  });

  it('detects external references', () => {
    const schema: TopLevelSchema = {$ref: 'https://example.com/schema.json'};
    expect(detectSchemaFeatures(schema).references).toBe(true);
    expect(detectSchemaFeatures(schema).externalReferences).toBe(true);
  });

  it('detects required', () => {
    expect(detectSchemaFeatures({type: 'object', required: ['name']}).required).toBe(true);
  });

  it('detects negation (not)', () => {
    expect(detectSchemaFeatures({not: {type: 'string'}}).negation).toBe(true);
  });

  it('detects boolean schemas', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        anything: true,
        nothing: false,
      },
    } as TopLevelSchema;
    expect(detectSchemaFeatures(schema).booleanSchemas).toBe(true);
  });

  it('detects descriptions', () => {
    expect(detectSchemaFeatures({description: 'A schema'}).descriptions).toBe(true);
  });

  it('detects titles', () => {
    expect(detectSchemaFeatures({title: 'My Schema'}).titles).toBe(true);
  });

  it('detects features in nested schemas', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: {
            deep: {
              enum: ['a', 'b'],
              default: 'a',
              description: 'A deep field',
            },
          },
        },
      },
    };
    const features = detectSchemaFeatures(schema);
    expect(features.enums).toBe(true);
    expect(features.defaultValues).toBe(true);
    expect(features.descriptions).toBe(true);
  });

  it('detects features inside $defs', () => {
    const schema: TopLevelSchema = {
      $defs: {
        myType: {
          type: 'string',
          title: 'My Type',
          allOf: [{minLength: 1}],
        },
      },
    };
    const features = detectSchemaFeatures(schema);
    expect(features.titles).toBe(true);
    expect(features.composition).toBe(true);
  });

  it('does not fail on malformed schema in lenient mode (default)', () => {
    const schema = {type: 123} as any;
    expect(() => detectSchemaFeatures(schema)).not.toThrow();
  });
});
