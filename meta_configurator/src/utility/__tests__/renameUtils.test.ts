import {describe, expect, it, vi} from 'vitest';
import {replacePropertyNameUtils, updateReferences} from '../renameUtils';
import {META_SCHEMA_SIMPLIFIED} from '../../packaged-schemas/metaSchemaSimplified';
import {type Path} from '../path';
import _ from 'lodash';
import {JsonSchemaWrapper} from '../../schema/jsonSchemaWrapper';
import {type JsonSchemaType} from '../../schema/jsonSchemaType';
import {SessionMode} from '../../store/sessionMode';

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
});
