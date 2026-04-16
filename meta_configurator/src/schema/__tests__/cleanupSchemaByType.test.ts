import {describe, expect, it, vi} from 'vitest';
import {type JsonSchemaType} from '../jsonSchemaType';
import {cleanupSchemaByType} from '@/schema/cleanupSchemaByType.ts';

describe('test cleanupSchemaByType', () => {
  const schema: any = {
    required: ['a'],
    properties: {
      obj: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
          },
        },
      },
      str: {
        type: 'string',
        minLength: 5,
        pattern: '^[a-zA-Z]+$',
      },
      num: {
        type: 'number',
        minimum: 0,
        maximum: 100,
      },
      arr: {
        type: 'array',
        items: {
          type: 'string',
        },
        minItems: 1,
      },
    },
  } as JsonSchemaType;

  it('test changing obj to something else removes the object constraints', () => {
    // initial object schema should have object-specific constraints
    const objectSchema = schema.properties.obj;
    expect(objectSchema).toHaveProperty('additionalProperties');
    expect(objectSchema).toHaveProperty('properties');

    // update object schema to be a string schema instead
    objectSchema.type = 'string';

    // run the cleanup function
    cleanupSchemaByType(objectSchema, 'string');

    // object-specific constraints should be removed
    expect(objectSchema).not.toHaveProperty('additionalProperties');
    expect(objectSchema).not.toHaveProperty('properties');
  });

  it('test changing string to something else removes the string constraints', () => {
    // initial string schema should have string-specific constraints
    const stringSchema = schema.properties.str;
    expect(stringSchema).toHaveProperty('minLength');
    expect(stringSchema).toHaveProperty('pattern');

    // update string schema to be a number schema instead
    stringSchema.type = 'number';

    // run the cleanup function
    cleanupSchemaByType(stringSchema, 'number');

    // string-specific constraints should be removed
    expect(stringSchema).not.toHaveProperty('minLength');
    expect(stringSchema).not.toHaveProperty('pattern');
  });

  it('test changing number to something else removes the number constraints', () => {
    // initial number schema should have number-specific constraints
    const numberSchema = schema.properties.num;
    expect(numberSchema).toHaveProperty('minimum');
    expect(numberSchema).toHaveProperty('maximum');

    // update number schema to be an array schema instead
    numberSchema.type = 'array';

    // run the cleanup function
    cleanupSchemaByType(numberSchema, 'array');

    // number-specific constraints should be removed
    expect(numberSchema).not.toHaveProperty('minimum');
    expect(numberSchema).not.toHaveProperty('maximum');
  });
});
