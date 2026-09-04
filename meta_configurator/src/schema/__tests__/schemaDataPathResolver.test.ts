import {describe, expect, it} from 'vitest';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  findDataPathsUsingSchema,
  findSchemaPathsForDataPath,
} from '@/schema/schemaDataPathResolver';

describe('SchemaDataPathResolver', () => {
  it('returns every allOf schema path governing one data property', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      allOf: [
        {properties: {name: {type: 'string'}}},
        {properties: {name: {minLength: 2}}},
      ],
    };

    expect(findSchemaPathsForDataPath(['name'], {name: 'Ada'}, schema)).toEqual([
      ['allOf', 0, 'properties', 'name'],
      ['allOf', 1, 'properties', 'name'],
    ]);
  });

  it('returns all matching patternProperties paths', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      patternProperties: {
        '^metric_': {type: 'number'},
        '_celsius$': {minimum: -273.15},
      },
    };

    expect(
      findSchemaPathsForDataPath(
        ['metric_celsius'],
        {metric_celsius: 21},
        schema
      )
    ).toEqual([
      ['patternProperties', '^metric_'],
      ['patternProperties', '_celsius$'],
    ]);
  });

  it('finds every instance governed by a reused reference', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        primary: {$ref: '#/$defs/person'},
        others: {type: 'array', items: {$ref: '#/$defs/person'}},
      },
      $defs: {
        person: {
          type: 'object',
          properties: {name: {type: 'string'}},
        },
      },
    };
    const data = {
      primary: {name: 'Ada'},
      others: [{name: 'Grace'}, {name: 'Margaret'}],
    };

    expect(findDataPathsUsingSchema(['$defs', 'person'], data, schema)).toEqual([
      ['primary'],
      ['others', 0],
      ['others', 1],
    ]);
    expect(
      findDataPathsUsingSchema(['$defs', 'person', 'properties', 'name'], data, schema)
    ).toEqual([
      ['primary', 'name'],
      ['others', 0, 'name'],
      ['others', 1, 'name'],
    ]);
  });

  it('follows only matching oneOf branches, including referenced branches', () => {
    const schema: TopLevelSchema = {
      oneOf: [{$ref: '#/$defs/measurement'}, {$ref: '#/$defs/note'}],
      $defs: {
        measurement: {
          type: 'object',
          required: ['kind', 'unit'],
          properties: {kind: {const: 'measurement'}, unit: {type: 'string'}},
        },
        note: {
          type: 'object',
          required: ['kind', 'author'],
          properties: {kind: {const: 'note'}, author: {type: 'string'}},
        },
      },
    };
    const data = {kind: 'measurement', unit: 'kelvin'};

    expect(findSchemaPathsForDataPath(['unit'], data, schema)).toContainEqual([
      '$defs',
      'measurement',
      'properties',
      'unit',
    ]);
    expect(findDataPathsUsingSchema(['$defs', 'note'], data, schema)).toEqual([]);
  });

  it('maps tuple positions, matching contains, and only genuinely unevaluated items', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      prefixItems: [{type: 'string'}],
      contains: {type: 'number'},
      unevaluatedItems: {type: 'boolean'},
    };
    const data = ['label', 42, true];

    expect(findSchemaPathsForDataPath([0], data, schema)).toEqual([
      ['prefixItems', 0],
    ]);
    expect(findSchemaPathsForDataPath([1], data, schema)).toEqual([['contains']]);
    expect(findSchemaPathsForDataPath([2], data, schema)).toEqual([
      ['unevaluatedItems'],
    ]);
  });
});
