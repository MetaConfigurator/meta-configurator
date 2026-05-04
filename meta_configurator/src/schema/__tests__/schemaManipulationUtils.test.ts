import {describe, it, vi} from 'vitest';
import {META_SCHEMA_SIMPLIFIED} from '../../packaged-schemas/metaSchemaSimplified';
import {JsonSchemaWrapper} from '../jsonSchemaWrapper';
import {type JsonSchemaType} from '../jsonSchemaType';
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

describe('test schemaManipulationUtils', () => {
  const schema = {
    required: ['a'],
    properties: {
      a: {
        type: 'object',
        properties: {
          a1: {
            type: 'object',
          },
          a2: {
            type: 'object',
            properties: {
              a2a: {
                type: 'string',
              },
            },
          },
          a3: {
            type: 'object',
            $ref: '#/properties/a/a2',
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
    },
  } as JsonSchemaType;

  const schemaWrapper = new JsonSchemaWrapper(schema, SessionMode.DataEditor, false);

  const metaSchemaWrapper = new JsonSchemaWrapper(
    META_SCHEMA_SIMPLIFIED,
    SessionMode.SchemaEditor,
    false
  );

  it('test extracting one element schema to the definitions section', () => {});
});
