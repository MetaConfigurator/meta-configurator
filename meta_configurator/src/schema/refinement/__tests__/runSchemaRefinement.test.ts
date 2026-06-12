import {describe, expect, it} from 'vitest';
import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import {
  ADD_EXAMPLES_DEFAULTS,
  DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
  DETECT_ENUMS_DEFAULTS,
  DETECT_PATTERN_PROPERTIES_DEFAULTS,
} from '@/schema/refinement/refineSchemaTypes';

function expectObjectSchema(schema: TopLevelSchema): asserts schema is JsonSchemaObjectType {
  if (typeof schema !== 'object' || schema === null) {
    throw new Error('Expected an object schema');
  }
}

describe('runSchemaRefinement', () => {
  it('adds examples from current data', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
          },
        },
      },
    } as const;

    const data = [
      {city: 'Stuttgart'},
      {city: 'Berlin'},
      {city: 'Muenchen'},
      {city: 'Berlin'},
      {city: null},
    ];

    const refined = runSchemaRefinement(schema, data, {
      addExamples: ADD_EXAMPLES_DEFAULTS,
    });
    expectObjectSchema(refined);

    expect(refined.items).toEqual({
      type: 'object',
      properties: {
        city: {
          type: 'string',
          examples: ['Stuttgart', 'Berlin', 'Muenchen'],
        },
      },
    });
  });

  it('detects enums from repeated values', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
          },
        },
      },
    } as const;

    const data = [{status: 'OPEN'}, {status: 'CLOSED'}, {status: 'OPEN'}, {status: 'OPEN'}];

    const refined = runSchemaRefinement(schema, data, {
      detectEnums: DETECT_ENUMS_DEFAULTS,
    });
    expectObjectSchema(refined);

    expect(refined.items).toEqual({
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'CLOSED'],
        },
      },
    });
  });

  it('detects additionalProperties from similar dynamic object entries', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        Felix: {
          type: 'object',
          properties: {
            name: {type: 'string'},
            firstname: {type: 'string'},
          },
          required: ['name', 'firstname'],
        },
        Robin: {
          type: 'object',
          properties: {
            name: {type: 'string'},
            firstname: {type: 'string'},
          },
          required: ['name', 'firstname'],
        },
        Benjamin: {
          type: 'object',
          properties: {
            name: {type: 'string'},
            firstname: {type: 'string'},
          },
          required: ['name', 'firstname'],
        },
      },
    };

    const data = {
      Felix: {name: 'F', firstname: 'N'},
      Robin: {name: 'R', firstname: 'S'},
      Benjamin: {name: 'B', firstname: 'U'},
    };

    const refined = runSchemaRefinement(schema, data, {
      detectAdditionalProperties: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
    });
    expectObjectSchema(refined);

    expect(refined.properties).toBeUndefined();
    expect(refined.additionalProperties).toEqual({
      type: 'object',
      properties: {
        name: {type: 'string'},
        firstname: {type: 'string'},
      },
      required: ['name', 'firstname'],
    });
  });

  it('detects patternProperties from matching key names', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        sensor_001: {type: 'number'},
        sensor_002: {type: 'number'},
        sensor_003: {type: 'number'},
      },
    };

    const data = {
      sensor_001: 12.4,
      sensor_002: 14.8,
      sensor_003: 9.2,
    };

    const refined = runSchemaRefinement(schema, data, {
      detectPatternProperties: DETECT_PATTERN_PROPERTIES_DEFAULTS,
    });
    expectObjectSchema(refined);

    expect(refined.properties).toBeUndefined();
    expect(refined.patternProperties).toEqual({
      '^sensor_[0-9]+$': {
        type: 'number',
      },
    });
  });
});
