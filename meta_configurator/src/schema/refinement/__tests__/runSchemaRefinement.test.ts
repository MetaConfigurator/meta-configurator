import {describe, expect, it} from 'vitest';
import type {JsonSchemaObjectType, TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  runSchemaRefinement,
  runSchemaRefinementFromSamples,
} from '@/schema/refinement/runSchemaRefinement';
import {
  ADD_EXAMPLES_DEFAULTS,
  DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
  DETECT_ENUMS_DEFAULTS,
  EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS,
  SORT_SCHEMA_PROPERTIES_DEFAULTS,
} from '@/schema/refinement/refineSchemaTypes';

function expectObjectSchema(schema: unknown): asserts schema is JsonSchemaObjectType {
  if (typeof schema !== 'object' || schema === null) {
    throw new Error('Expected an object schema');
  }
}

describe('runSchemaRefinement', () => {
  it('returns a deep copy without mutating the input schema', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {name: {type: 'string'}},
    };

    const refined = runSchemaRefinement(schema, {name: 'Ada'}, {});
    expectObjectSchema(refined);
    refined.properties = {};

    expect(refined).not.toBe(schema);
    expect(schema).toEqual({
      type: 'object',
      properties: {name: {type: 'string'}},
    });
  });

  it('combines observations from several root data instances', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        name: {type: 'string'},
        status: {type: 'string'},
      },
    };

    const refined = runSchemaRefinementFromSamples(
      schema,
      [
        {name: 'Ada', status: 'OPEN'},
        {name: 'Grace', status: 'CLOSED'},
        {name: 'Linus', status: 'OPEN'},
        {name: 'Margaret', status: 'OPEN'},
      ],
      {
        addExamples: ADD_EXAMPLES_DEFAULTS,
        detectEnums: DETECT_ENUMS_DEFAULTS,
      }
    );
    expectObjectSchema(refined);

    expect(refined.properties?.name).toEqual({
      type: 'string',
      examples: ['Ada', 'Grace', 'Linus', 'Margaret'],
    });
    expect(refined.properties?.status).toEqual({
      type: 'string',
      enum: ['OPEN', 'CLOSED'],
    });
  });

  it('honors example limits and duplicate handling options', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      items: {type: 'string'},
    };

    const refined = runSchemaRefinement(schema, ['Ada', 'Ada', 'Grace'], {
      addExamples: {
        maxExamplesPerField: 2,
        uniqueOnly: false,
        ignoreNullValues: true,
      },
    });
    expectObjectSchema(refined);
    expectObjectSchema(refined.items);

    expect(refined.items.examples).toEqual(['Ada', 'Ada']);
  });

  it('sorts schema properties alphabetically as a refinement step', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        zip: {type: 'string'},
        age: {type: 'number'},
        name: {
          type: 'object',
          properties: {
            last: {type: 'string'},
            first: {type: 'string'},
          },
        },
      },
    };

    const refined = runSchemaRefinement(
      schema,
      {},
      {
        sortSchemaPropertiesAlphabetically: SORT_SCHEMA_PROPERTIES_DEFAULTS,
      }
    );
    expectObjectSchema(refined);

    expect(Object.keys(refined.properties ?? {})).toEqual(['age', 'name', 'zip']);
    expectObjectSchema(refined.properties?.name);
    expect(Object.keys(refined.properties?.name.properties ?? {})).toEqual(['first', 'last']);
  });

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

  it('adds examples to nullable primitive fields', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nickname: {type: ['string', 'null']},
        },
      },
    };

    const refined = runSchemaRefinement(
      schema,
      [{nickname: 'Ada'}, {nickname: null}, {nickname: 'Grace'}],
      {addExamples: ADD_EXAMPLES_DEFAULTS}
    );
    expectObjectSchema(refined);
    expectObjectSchema(refined.items);
    expectObjectSchema(refined.items.properties?.nickname);

    expect(refined.items.properties.nickname.examples).toEqual(['Ada', 'Grace']);
  });

  it('routes array item samples to contains schemas', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      contains: {type: 'string'},
    };

    const refined = runSchemaRefinement(schema, ['Ada', 'Grace'], {
      addExamples: ADD_EXAMPLES_DEFAULTS,
    });
    expectObjectSchema(refined);
    expectObjectSchema(refined.contains);

    expect(refined.contains.examples).toEqual(['Ada', 'Grace']);
  });

  it('routes samples by position for legacy tuple-style items schemas', () => {
    const schema = {
      type: 'array',
      items: [{type: 'string'}, {type: 'integer'}],
    } as unknown as TopLevelSchema;

    const refined = runSchemaRefinement(schema, ['Ada', 42], {
      addExamples: ADD_EXAMPLES_DEFAULTS,
    }) as unknown as {items: JsonSchemaObjectType[]};

    expect(refined.items[0]!.examples).toEqual(['Ada']);
    expect(refined.items[1]!.examples).toEqual([42]);
  });

  it('uses schema traversal paths without refining unrelated definitions', () => {
    const schema: TopLevelSchema = {
      allOf: [
        {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
        },
      ],
      $defs: {
        unusedStatus: {
          type: 'string',
          enum: ['OPEN'],
          examples: ['OPEN'],
        },
      },
    };

    const refined = runSchemaRefinement(
      schema,
      {name: 'Ada'},
      {addExamples: ADD_EXAMPLES_DEFAULTS}
    );
    expectObjectSchema(refined);
    expectObjectSchema(refined.allOf?.[0]);
    expectObjectSchema(refined.allOf?.[0].properties?.name);

    expect(refined.allOf?.[0].properties?.name.examples).toEqual(['Ada']);
    expect(refined.$defs?.unusedStatus).toEqual({
      type: 'string',
      enum: ['OPEN'],
      examples: ['OPEN'],
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

  it('does not infer an enum after discarding incompatible observations', () => {
    const schema: TopLevelSchema = {
      type: 'array',
      items: {},
    };

    const refined = runSchemaRefinement(schema, ['OPEN', 'OPEN', 'OPEN', 'OPEN', {code: 1}], {
      detectEnums: DETECT_ENUMS_DEFAULTS,
    });
    expectObjectSchema(refined);
    expectObjectSchema(refined.items);

    expect(refined.items.enum).toBeUndefined();
  });

  it('removes examples when a field becomes an enum', () => {
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
      addExamples: ADD_EXAMPLES_DEFAULTS,
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

  it('removes examples from existing enum fields', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'CLOSED'],
          examples: ['OPEN'],
        },
      },
    };

    const refined = runSchemaRefinement(
      schema,
      {status: 'OPEN'},
      {
        addExamples: ADD_EXAMPLES_DEFAULTS,
      }
    );
    expectObjectSchema(refined);

    expect(refined).toEqual({
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'CLOSED'],
        },
      },
    });
  });

  it('detects additionalProperties inside a oneOf branch, like the other refinements', () => {
    const schema: TopLevelSchema = {
      oneOf: [
        {
          type: 'object',
          properties: {
            alpha: {type: 'object', properties: {id: {type: 'string'}, unit: {type: 'string'}}},
            beta: {type: 'object', properties: {id: {type: 'string'}, unit: {type: 'string'}}},
            gamma: {type: 'object', properties: {id: {type: 'string'}, unit: {type: 'string'}}},
          },
        },
      ],
    };

    const data = {
      alpha: {id: 'a', unit: 'K'},
      beta: {id: 'b', unit: 'bar'},
      gamma: {id: 'c', unit: 'mg'},
    };

    const refined = runSchemaRefinement(schema, data, {
      detectAdditionalProperties: DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
    });
    expectObjectSchema(refined);

    const branchSchema = refined.oneOf?.[0];
    expectObjectSchema(branchSchema);
    expect(branchSchema.properties).toBeUndefined();
    expect(branchSchema.additionalProperties).toEqual({
      type: 'object',
      properties: {id: {type: 'string'}, unit: {type: 'string'}},
      required: ['id', 'unit'],
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

  it('extracts inlined sub-schemas into $defs references', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
        },
      },
    };

    const refined = runSchemaRefinement(
      schema,
      {person: {name: 'Ada'}},
      {
        extractSubSchemasIntoReferences: EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS,
      }
    );
    expectObjectSchema(refined);

    expect(refined.properties?.person).toEqual({
      $ref: '#/$defs/person',
    });
    expect(refined.$defs).toEqual({
      person: {
        type: 'object',
        properties: {
          name: {type: 'string'},
        },
      },
    });
  });

  it('does not keep per-instance $defs after collapsing similar dynamic object keys into additionalProperties', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        'patient-123': {
          type: 'object',
          properties: {
            firstName: {type: 'string'},
            lastName: {type: 'string'},
            age: {type: 'integer'},
            active: {type: 'boolean'},
          },
          required: ['firstName', 'lastName', 'age', 'active'],
        },
        'patient-456': {
          type: 'object',
          properties: {
            firstName: {type: 'string'},
            lastName: {type: 'string'},
            age: {type: 'integer'},
            active: {type: 'boolean'},
          },
          required: ['firstName', 'lastName', 'age', 'active'],
        },
      },
      required: ['patient-123', 'patient-456'],
    };

    const data = {
      'patient-123': {
        firstName: 'Max',
        lastName: 'Mustermann',
        age: 32,
        active: true,
      },
      'patient-456': {
        firstName: 'Anna',
        lastName: 'Müller',
        age: 27,
        active: false,
      },
    };

    const refined = runSchemaRefinement(schema, data, {
      detectAdditionalProperties: {
        ...DETECT_ADDITIONAL_PROPERTIES_DEFAULTS,
        minProperties: 2,
      },
      addExamples: ADD_EXAMPLES_DEFAULTS,
      extractSubSchemasIntoReferences: EXTRACT_SUB_SCHEMAS_INTO_REFERENCES_DEFAULTS,
    });
    expectObjectSchema(refined);

    expect(refined.$defs).toBeUndefined();
    expect(refined.properties).toBeUndefined();
    expect(refined.required).toBeUndefined();
    expect(refined.additionalProperties).toEqual({
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          examples: ['Max', 'Anna'],
        },
        lastName: {
          type: 'string',
          examples: ['Mustermann', 'Müller'],
        },
        age: {
          type: 'integer',
          examples: [32, 27],
        },
        active: {
          type: 'boolean',
          examples: [true, false],
        },
      },
      required: ['firstName', 'lastName', 'age', 'active'],
    });
  });
  it('gives each oneOf branch only the samples that branch accepts', () => {
    const schema: TopLevelSchema = {
      oneOf: [
        {
          type: 'object',
          required: ['kind', 'unit'],
          properties: {kind: {const: 'measurement'}, unit: {type: 'string'}},
        },
        {
          type: 'object',
          required: ['kind', 'author'],
          properties: {kind: {const: 'note'}, author: {type: 'string'}},
        },
      ],
    };

    const refined = runSchemaRefinementFromSamples(
      schema,
      [
        {kind: 'measurement', unit: 'kelvin'},
        {kind: 'measurement', unit: 'pascal'},
        {kind: 'note', author: 'Ada'},
      ],
      {addExamples: ADD_EXAMPLES_DEFAULTS}
    );

    expectObjectSchema(refined);
    const [measurementBranch, noteBranch] = refined.oneOf as JsonSchemaObjectType[];
    expect(measurementBranch?.properties?.unit).toEqual({
      type: 'string',
      examples: ['kelvin', 'pascal'],
    });
    // "Ada" belongs to the note branch, so it must not show up as a unit example
    expect(noteBranch?.properties?.author).toEqual({type: 'string', examples: ['Ada']});
  });

  it('keeps giving every allOf branch all samples, since each branch describes them', () => {
    const schema: TopLevelSchema = {
      allOf: [
        {type: 'object', properties: {name: {type: 'string'}}},
        {type: 'object', properties: {status: {type: 'string'}}},
      ],
    };

    const refined = runSchemaRefinementFromSamples(
      schema,
      [
        {name: 'Ada', status: 'OPEN'},
        {name: 'Grace', status: 'CLOSED'},
      ],
      {addExamples: ADD_EXAMPLES_DEFAULTS}
    );

    expectObjectSchema(refined);
    const [nameBranch, statusBranch] = refined.allOf as JsonSchemaObjectType[];
    expect(nameBranch?.properties?.name).toEqual({type: 'string', examples: ['Ada', 'Grace']});
    expect(statusBranch?.properties?.status).toEqual({
      type: 'string',
      examples: ['OPEN', 'CLOSED'],
    });
  });
});
