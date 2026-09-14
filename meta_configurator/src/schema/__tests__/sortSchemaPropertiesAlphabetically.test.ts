import {describe, expect, it} from 'vitest';
import {sortSchemaPropertiesAlphabetically} from '@/schema/sortSchemaPropertiesAlphabetically';

describe('sortSchemaPropertiesAlphabetically', () => {
  it('sorts properties recursively while preserving schema keyword values', () => {
    const result = sortSchemaPropertiesAlphabetically({
      type: 'object',
      title: 'Person',
      properties: {
        zip: {type: 'string'},
        age: {type: 'number'},
        nested: {
          type: 'object',
          properties: {
            zebra: {type: 'number'},
            apple: {type: 'number'},
          },
        },
      },
    });

    expect(Object.keys(result.properties)).toEqual(['age', 'nested', 'zip']);
    expect(Object.keys(result.properties.nested.properties)).toEqual(['apple', 'zebra']);
    expect(result.type).toBe('object');
    expect(result.title).toBe('Person');
  });

  it('recurses through array items and compositional schemas', () => {
    const result = sortSchemaPropertiesAlphabetically({
      items: {
        properties: {
          second: {type: 'string'},
          first: {type: 'string'},
        },
      },
      allOf: [
        {
          properties: {
            zebra: {type: 'string'},
            apple: {type: 'string'},
          },
        },
      ],
    });

    expect(Object.keys(result.items.properties)).toEqual(['first', 'second']);
    expect(Object.keys(result.allOf[0]!.properties)).toEqual(['apple', 'zebra']);
  });

  it('sorts definition and property-map keywords', () => {
    const result = sortSchemaPropertiesAlphabetically({
      $defs: {zebra: {type: 'string'}, apple: {type: 'string'}},
      definitions: {beta: {type: 'string'}, alpha: {type: 'string'}},
      patternProperties: {'^z': {type: 'string'}, '^a': {type: 'string'}},
      dependentSchemas: {foo: {type: 'object'}, bar: {type: 'object'}},
    });

    expect(Object.keys(result.$defs)).toEqual(['apple', 'zebra']);
    expect(Object.keys(result.definitions)).toEqual(['alpha', 'beta']);
    expect(Object.keys(result.patternProperties)).toEqual(['^a', '^z']);
    expect(Object.keys(result.dependentSchemas)).toEqual(['bar', 'foo']);
  });

  it('preserves array order', () => {
    const result = sortSchemaPropertiesAlphabetically({
      required: ['zip', 'age', 'name'],
      enum: ['c', 'b', 'a'],
    });

    expect(result.required).toEqual(['zip', 'age', 'name']);
    expect(result.enum).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input', () => {
    const input = {
      type: 'object',
      properties: {
        zip: {type: 'string'},
        age: {type: 'number'},
      },
    };

    sortSchemaPropertiesAlphabetically(input);

    expect(Object.keys(input.properties)).toEqual(['zip', 'age']);
  });

  it.each([true, false, null, 42, 'hello'])('passes primitive %j through', value => {
    expect(sortSchemaPropertiesAlphabetically(value)).toBe(value);
  });
});
