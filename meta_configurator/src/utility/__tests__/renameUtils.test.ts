import {describe, expect, it, vi} from 'vitest';
import {replacePropertyNameUtils, updateReferences} from '../renameUtils';
import {findDataPathsUsingSchema} from '@/schema/schemaDataPathResolver';
import {META_SCHEMA_SIMPLIFIED} from '../../packaged-schemas/metaSchemaSimplified';
import {type Path} from '../path';
import _ from 'lodash';
import {JsonSchemaWrapper} from '../../schema/jsonSchemaWrapper';
import {type JsonSchemaType} from '../../schema/jsonSchemaType';
import {SessionMode} from '../../store/sessionMode';
import {confirmationService} from '../confirmationService';
import {useSettings} from '@/settings/useSettings';

// avoid constructing useDataLink store through imports, it is not required for this component
vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  useCurrentData: vi.fn(),
  useCurrentSchema: vi.fn(),
  getUserSelectionForMode: vi.fn(),
  getValidationForMode: vi.fn(),
  getSessionForMode: vi.fn(),
}));

describe('test renameUtils', () => {
  const schema = {
    required: ['a'],
    properties: {
      a: {
        type: 'object',
        properties: {
          a1: {
            type: 'string',
          },
        },
      },
      b: {
        type: 'object',
        $ref: '#/properties/a',
      },
      c: {
        type: 'string',
        $ref: '#/properties/a/a1',
      },
      a_other_word_starting_with_a: {
        type: 'string',
      },
      e: {
        type: 'string',
        // when a gets renamed, we want to update the references to a, but not the references to a_other_word_starting_with_a
        $ref: '#/properties/a_other_word_starting_with_a',
      },
    },
  } as JsonSchemaType;

  const schemaWrapper = new JsonSchemaWrapper(schema, SessionMode.DataEditor, false);

  const data = {
    a: {
      a1: 'test1',
    },
    b: {
      a1: 'test2',
    },
    c: 'test3',
    a_other_word_starting_with_a: 'test4',
    e: 'test5',
  } as any;

  const metaSchemaWrapper = new JsonSchemaWrapper(
    META_SCHEMA_SIMPLIFIED,
    SessionMode.SchemaEditor,
    false
  );

  it('test replacePropertyNameUtils on data level', () => {
    const mutableData = structuredClone(data);
    const subPath = ['a', 'a1'];
    const oldName = 'a1';
    const newName = 'a3';
    const updateDataFct = (path: Path, newValue: any) => {
      _.set(mutableData, path, newValue);
    };
    const result = replacePropertyNameUtils(
      subPath,
      oldName,
      newName,
      data,
      schemaWrapper,
      updateDataFct
    );
    // result is the new path of the renamed property
    expect(result).toEqual(['a', 'a3']);
    // check if the data was updated correctly, changing the name of the property from a1 to a3
    expect(mutableData).toEqual({
      a: {
        a3: 'test1',
      },
      b: {
        a1: 'test2',
      },
      c: 'test3',
      a_other_word_starting_with_a: 'test4',
      e: 'test5',
    });
  });

  it('test replacePropertyNameUtils on schema level. This implicitly tests whether references and required props are updated also.', () => {
    const mutableSchema: any & JsonSchemaType = structuredClone(schema);
    const path = ['properties', 'a'];
    const oldName = 'a';
    const newName = 'd';
    const updateDataFct = (path: Path, newValue: any) => {
      _.set(mutableSchema, path, newValue);
    };

    const result = replacePropertyNameUtils(
      path,
      oldName,
      newName,
      mutableSchema,
      metaSchemaWrapper,
      updateDataFct
    );
    // result is the new path of the renamed property
    expect(result).toEqual(['properties', 'd']);
    // check if the data and also all references and also the required field were updated correctly
    expect(mutableSchema).toEqual({
      required: ['d'],
      properties: {
        d: {
          type: 'object',
          properties: {
            a1: {
              type: 'string',
            },
          },
        },
        b: {
          type: 'object',
          $ref: '#/properties/d',
        },
        c: {
          type: 'string',
          $ref: '#/properties/d/a1',
        },
        a_other_word_starting_with_a: {
          type: 'string',
        },
        e: {
          type: 'string',
          // when a gets renamed, we want to update the references to a, but not the references to a_other_word_starting_with_a
          $ref: '#/properties/a_other_word_starting_with_a',
        },
      },
    });
  });

  it('test reference update for a case where the updated property does not start with a hashtag but the reference does', () => {
    const oldPath = ['$defs', 'SimulationSettings'];
    const oldName = 'SimulationSettings';
    const newName = 'SimulationSettingsRenamed';
    const currentData = {
      $defs: {
        SimulationSettings: {
          type: 'object',
          properties: {
            a: {type: 'string'},
          },
        },
      },
      type: 'object',
      properties: {
        simulationSettings: {
          $ref: '#/$defs/SimulationSettings',
        },
      },
    };

    const updateDataFct = (subPath: Path, newValue: any) => {
      _.set(currentData, subPath, newValue);
    };

    // rename property which triggers reference update
    const result = replacePropertyNameUtils(
      oldPath,
      oldName,
      newName,
      currentData,
      metaSchemaWrapper,
      updateDataFct
    );

    // result is the new path of the renamed property
    expect(result).toEqual(['$defs', 'SimulationSettingsRenamed']);

    // check if the data was updated correctly
    expect(currentData).toEqual({
      $defs: {
        SimulationSettingsRenamed: {
          type: 'object',
          properties: {
            a: {type: 'string'},
          },
        },
      },
      type: 'object',
      properties: {
        simulationSettings: {
          $ref: '#/$defs/SimulationSettingsRenamed',
        },
      },
    });
  });

  it('updates only matching $ref targets when references are rewritten directly', () => {
    const currentData = {
      properties: {
        source: {
          type: 'object',
        },
        consumer: {
          $ref: '#/properties/source',
        },
        nestedConsumer: {
          allOf: [
            {
              $ref: '#/properties/source/child',
            },
          ],
        },
        unrelated: {
          $ref: '#/properties/sourceExtra',
        },
      },
    };

    const updateDataFct = (subPath: Path, newValue: any) => {
      _.set(currentData, subPath, newValue);
    };

    updateReferences(
      ['properties', 'source'],
      ['properties', 'renamedSource'],
      currentData,
      updateDataFct
    );

    expect(currentData).toEqual({
      properties: {
        source: {
          type: 'object',
        },
        consumer: {
          $ref: '#/properties/renamedSource',
        },
        nestedConsumer: {
          allOf: [
            {
              $ref: '#/properties/renamedSource/child',
            },
          ],
        },
        unrelated: {
          $ref: '#/properties/sourceExtra',
        },
      },
    });
  });

  it('renames the field in instance data when there is no conflict', () => {
    const mutableSchema: JsonSchemaType = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    };
    const mutableInstanceData: Record<string, any> = {
      name: 'Alice',
    };

    const schemaWrapper = new JsonSchemaWrapper(mutableSchema, SessionMode.SchemaEditor, false);

    const updateSchema = (path: Path, value: any) => {
      _.set(mutableSchema, path, value);
    };

    const updateInstanceData = (path: Path, value: any) => {
      if (path.length === 0) {
        Object.keys(mutableInstanceData).forEach(key => {
          delete mutableInstanceData[key];
        });
        Object.assign(mutableInstanceData, value);
        return;
      }

      _.set(mutableInstanceData, path, value);
    };

    replacePropertyNameUtils(
      ['properties', 'name'],
      'name',
      'fullName',
      mutableSchema,
      schemaWrapper,
      updateSchema,
      mutableInstanceData,
      updateInstanceData
    );

    expect(mutableInstanceData).toEqual({
      fullName: 'Alice',
    });
  });

  it('renames the field in instance data and overwrites conflicting data', () => {
    const mutableData: Record<string, any> = {
      name: 'Alice',
      fullName: 'Old Value',
    };
    const schema = {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string' as const,
        },
        fullName: {
          type: 'string' as const,
        },
      },
    } satisfies JsonSchemaType;

    const schemaWrapper = new JsonSchemaWrapper(schema, SessionMode.SchemaEditor, false);

    const updateSchemaFct = (path: Path, newValue: any) => {
      _.set(schema, path, newValue);
    };

    const updateInstanceDataFct = (path: Path, newValue: any) => {
      if (path.length === 0) {
        Object.keys(mutableData).forEach(key => {
          delete mutableData[key];
        });
        Object.assign(mutableData, newValue);
        return;
      }

      _.set(mutableData, path, newValue);
    };

    vi.spyOn(confirmationService, 'require').mockImplementation(options => {
      options.accept?.();
    });

    replacePropertyNameUtils(
      ['properties', 'name'],
      'name',
      'fullName',
      schema,
      schemaWrapper,
      updateSchemaFct,
      mutableData,
      updateInstanceDataFct
    );

    expect(mutableData).toEqual({
      fullName: 'Alice',
    });

    vi.restoreAllMocks();
  });

  it('renames the field in instance data and keeps conflicting data unchanged', () => {
    const mutableData: Record<string, any> = {
      name: 'Alice',
      fullName: 'Existing Name',
    };

    const schema = {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string' as const,
        },
        fullName: {
          type: 'string' as const,
        },
      },
    } satisfies JsonSchemaType;

    const schemaWrapper = new JsonSchemaWrapper(schema, SessionMode.SchemaEditor, false);

    const updateSchemaFct = (path: Path, newValue: any) => {
      _.set(schema, path, newValue);
    };

    const updateInstanceDataFct = (path: Path, newValue: any) => {
      if (path.length === 0) {
        Object.keys(mutableData).forEach(key => {
          delete mutableData[key];
        });
        Object.assign(mutableData, newValue);
        return;
      }

      _.set(mutableData, path, newValue);
    };

    vi.spyOn(confirmationService, 'require').mockImplementation(options => {
      options.reject?.();
    });

    replacePropertyNameUtils(
      ['properties', 'name'],
      'name',
      'fullName',
      schema,
      schemaWrapper,
      updateSchemaFct,
      mutableData,
      updateInstanceDataFct
    );

    expect(mutableData).toEqual({
      fullName: 'Existing Name',
    });

    vi.restoreAllMocks();
  });
  it('deletes a field from the schema and keeps instance data when the user chooses keep data', () => {
    const mutableSchema: JsonSchemaType = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    };

    const mutableInstanceData = {
      name: 'Alice',
    };

    const schemaWrapper = new JsonSchemaWrapper(mutableSchema, SessionMode.SchemaEditor, false);

    const updateSchema = (path: Path, newValue: any) => {
      _.set(mutableSchema, path, newValue);
    };

    const updateInstanceData = (path: Path, newValue: any) => {
      _.set(mutableInstanceData, path, newValue);
    };

    vi.spyOn(confirmationService, 'require').mockImplementation(options => {
      options.reject?.();
    });

    replacePropertyNameUtils(
      ['properties', 'name'],
      'name',
      'name',
      mutableSchema,
      schemaWrapper,
      updateSchema,
      mutableInstanceData,
      updateInstanceData
    );

    expect(mutableInstanceData).toEqual({
      name: 'Alice',
    });

    vi.restoreAllMocks();
  });

  it('finds the instance data path for a simple schema path', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        person: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
            },
          },
        },
      },
    } satisfies JsonSchemaType;

    const instanceData = {
      person: {
        name: 'Alice',
      },
    };

    const result = findDataPathsUsingSchema(['properties', 'person'], instanceData, schema);

    expect(result).toEqual([['person']]);
  });

  it('finds all instance data paths for objects inside an array', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        people: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              name: {
                type: 'string' as const,
              },
            },
          },
        },
      },
    } satisfies JsonSchemaType;

    const instanceData = {
      people: [
        {
          name: 'Alice',
        },
        {
          name: 'Felix',
        },
      ],
    };

    const result = findDataPathsUsingSchema(
      ['properties', 'people', 'items'],
      instanceData,
      schema
    );

    expect(result).toEqual([
      ['people', 0],
      ['people', 1],
    ]);
  });

  it('finds all instance data paths for objects inside additionalProperties', () => {
    const schema = {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      },
    };

    const data = {
      p1: {
        name: 'Devesh',
      },
      p2: {
        name: 'Felix',
      },
    };

    const result = findDataPathsUsingSchema(['additionalProperties'], data, schema);

    expect(result).toEqual([['p1'], ['p2']]);
  });

  it('finds instance data paths for nested properties inside an array', () => {
    const schema = {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    const data = {
      people: [{name: 'Alice'}, {name: 'Bob'}],
    };

    const result = findDataPathsUsingSchema(
      ['properties', 'people', 'items', 'properties', 'name'],
      data,
      schema
    );

    expect(result).toEqual([
      ['people', 0, 'name'],
      ['people', 1, 'name'],
    ]);
  });

  it('finds instance data paths for nested properties inside additionalProperties and arrays', () => {
    const schema = {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          people: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    };

    const data = {
      group1: {
        people: [{name: 'Alice'}, {name: 'Bob'}],
      },
      group2: {
        people: [{name: 'Charlie'}],
      },
    };

    const result = findDataPathsUsingSchema(
      ['additionalProperties', 'properties', 'people', 'items', 'properties', 'name'],
      data,
      schema
    );

    expect(result).toEqual([
      ['group1', 'people', 0, 'name'],
      ['group1', 'people', 1, 'name'],
      ['group2', 'people', 0, 'name'],
    ]);
  });

  it('finds instance data paths for additionalProperties inside an array', () => {
    const schema = {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    };

    const data = {
      people: [
        {
          person1: {
            name: 'Alice',
          },
          person2: {
            name: 'Bob',
          },
        },
        {
          person3: {
            name: 'Charlie',
          },
        },
      ],
    };

    const result = findDataPathsUsingSchema(
      ['properties', 'people', 'items', 'additionalProperties', 'properties', 'name'],
      data,
      schema
    );

    expect(result).toEqual([
      ['people', 0, 'person1', 'name'],
      ['people', 0, 'person2', 'name'],
      ['people', 1, 'person3', 'name'],
    ]);
  });

  it('finds instance data paths for nested properties inside nested arrays', () => {
    const schema = {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              people: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const data = {
      groups: [
        {
          people: [{name: 'Alice'}, {name: 'Bob'}],
        },
        {
          people: [{name: 'Charlie'}],
        },
      ],
    };

    const result = findDataPathsUsingSchema(
      ['properties', 'groups', 'items', 'properties', 'people', 'items', 'properties', 'name'],
      data,
      schema
    );

    expect(result).toEqual([
      ['groups', 0, 'people', 0, 'name'],
      ['groups', 0, 'people', 1, 'name'],
      ['groups', 1, 'people', 0, 'name'],
    ]);
  });

  it('renames instance data when one of several allOf paths owns the property', () => {
    const mutableSchema: JsonSchemaType = {
      type: 'object',
      allOf: [
        {
          properties: {
            person: {
              type: 'object',
              properties: {name: {type: 'string'}},
            },
          },
        },
        {
          properties: {
            person: {
              type: 'object',
              required: ['name'],
              properties: {name: {minLength: 2}},
            },
          },
        },
      ],
    };
    const mutableInstanceData = {person: {name: 'Ada'}};
    const schemaWrapper = new JsonSchemaWrapper(mutableSchema, SessionMode.SchemaEditor, false);

    replacePropertyNameUtils(
      ['allOf', 0, 'properties', 'person', 'properties', 'name'],
      'name',
      'fullName',
      mutableSchema,
      schemaWrapper,
      (path, value) => _.set(mutableSchema, path, value),
      mutableInstanceData,
      (path, value) => _.set(mutableInstanceData, path, value)
    );

    expect(mutableInstanceData).toEqual({person: {fullName: 'Ada'}});
  });

  it('updates each referenced instance once when several schema paths reach the same definition', () => {
    const mutableSchema: JsonSchemaType = {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          items: {
            $ref: '#/$defs/person',
            allOf: [{$ref: '#/$defs/person'}],
          },
        },
      },
      $defs: {
        person: {
          type: 'object',
          properties: {name: {type: 'string'}},
        },
      },
    };
    const mutableInstanceData = {people: [{name: 'Ada'}, {name: 'Grace'}]};
    const schemaWrapper = new JsonSchemaWrapper(mutableSchema, SessionMode.SchemaEditor, false);
    const updatedInstancePaths: Path[] = [];

    replacePropertyNameUtils(
      ['$defs', 'person', 'properties', 'name'],
      'name',
      'fullName',
      mutableSchema,
      schemaWrapper,
      (path, value) => _.set(mutableSchema, path, value),
      mutableInstanceData,
      (path, value) => {
        updatedInstancePaths.push(path);
        _.set(mutableInstanceData, path, value);
      }
    );

    expect(updatedInstancePaths).toEqual([
      ['people', 0],
      ['people', 1],
    ]);
    expect(mutableInstanceData).toEqual({
      people: [{fullName: 'Ada'}, {fullName: 'Grace'}],
    });
  });

  it('skips instance synchronization when the schema exceeds the configured size limit', () => {
    const mutableSchema: JsonSchemaType = {
      type: 'object',
      description: 'x'.repeat(2_000),
      properties: {name: {type: 'string'}},
    };
    const mutableInstanceData = {name: 'Ada'};
    const schemaWrapper = new JsonSchemaWrapper(mutableSchema, SessionMode.SchemaEditor, false);
    const updateInstanceData = vi.fn();
    const settings = useSettings();
    const previousLimit = settings.value.performance.maxSchemaSizeForDataSynchronization;
    settings.value.performance.maxSchemaSizeForDataSynchronization = 1_000;

    try {
      replacePropertyNameUtils(
        ['properties', 'name'],
        'name',
        'fullName',
        mutableSchema,
        schemaWrapper,
        (path, value) => _.set(mutableSchema, path, value),
        mutableInstanceData,
        updateInstanceData
      );
    } finally {
      settings.value.performance.maxSchemaSizeForDataSynchronization = previousLimit;
    }

    expect(mutableSchema.properties).toEqual({fullName: {type: 'string'}});
    expect(mutableInstanceData).toEqual({name: 'Ada'});
    expect(updateInstanceData).not.toHaveBeenCalled();
  });
});
