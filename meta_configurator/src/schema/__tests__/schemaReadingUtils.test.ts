import {describe, expect, it, vi} from 'vitest';
import {
  getObjectSchemaAtDataPath,
  getParentObjectSchemaAtDataPath,
} from '@/schema/schemaReadingUtils';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';

vi.mock('@/data/useDataLink', () => ({
  getSchemaForMode: vi.fn(),
  getDataForMode: vi.fn(),
  useCurrentData: vi.fn(),
  useCurrentSchema: vi.fn(),
  getUserSelectionForMode: vi.fn(),
  getValidationForMode: vi.fn(),
  getSessionForMode: vi.fn(),
}));

describe('schemaReadingUtils', () => {
  it('resolves the matching oneOf object schema variant for a data path', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        backend: {
          oneOf: [
            {
              type: 'object',
              required: ['endpoint'],
              additionalProperties: false,
              properties: {
                endpoint: {type: 'string'},
              },
            },
            {
              type: 'object',
              required: ['relay', 'endpoint'],
              additionalProperties: false,
              properties: {
                relay: {type: 'string'},
                endpoint: {type: 'string'},
              },
            },
          ],
        },
      },
    };
    const data = {
      backend: {
        endpoint: 'https://api.openai.com/v1/',
      },
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['backend'], data);
    const parentSchema = getParentObjectSchemaAtDataPath(schema, ['backend', 'endpoint'], data);

    expect(schemaAtPath?.required).toEqual(['endpoint']);
    expect(parentSchema?.required).toEqual(['endpoint']);
  });

  it('returns the root object schema for the empty data path', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      required: ['backend'],
      properties: {
        backend: {
          type: 'object',
          required: ['endpoint'],
          properties: {
            endpoint: {type: 'string'},
          },
        },
      },
    };
    const data = {
      backend: {
        endpoint: 'https://api.openai.com/v1/',
      },
    };

    const schemaAtRoot = getObjectSchemaAtDataPath(schema, [], data);

    expect(schemaAtRoot?.required).toEqual(['backend']);
  });

  it('resolves nested object schemas along a normal property path', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        aiIntegration: {
          type: 'object',
          required: ['backend'],
          properties: {
            backend: {
              type: 'object',
              required: ['endpoint'],
              properties: {
                endpoint: {type: 'string'},
              },
            },
          },
        },
      },
    };
    const data = {
      aiIntegration: {
        backend: {
          endpoint: 'https://api.openai.com/v1/',
        },
      },
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['aiIntegration', 'backend'], data);
    const parentSchema = getParentObjectSchemaAtDataPath(
      schema,
      ['aiIntegration', 'backend', 'endpoint'],
      data
    );

    expect(schemaAtPath?.required).toEqual(['endpoint']);
    expect(parentSchema?.required).toEqual(['endpoint']);
  });

  it('resolves the relay variant when relay-specific properties are present', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        backend: {
          oneOf: [
            {
              type: 'object',
              required: ['endpoint'],
              additionalProperties: false,
              properties: {
                endpoint: {type: 'string'},
              },
            },
            {
              type: 'object',
              required: ['relay', 'endpoint'],
              additionalProperties: false,
              properties: {
                relay: {type: 'string', pattern: '^https://'},
                endpoint: {type: 'string'},
              },
            },
          ],
        },
      },
    };
    const data = {
      backend: {
        relay: 'https://metaconfigurator.informatik.uni-stuttgart.de/relay',
        endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
      },
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['backend'], data);

    expect(schemaAtPath?.required).toEqual(['relay', 'endpoint']);
  });

  it('falls back to the first declared oneOf variant when none validate fully', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        backend: {
          oneOf: [
            {
              type: 'object',
              required: ['endpoint'],
              additionalProperties: false,
              properties: {
                endpoint: {type: 'string'},
              },
            },
            {
              type: 'object',
              required: ['relay', 'endpoint'],
              additionalProperties: false,
              properties: {
                relay: {type: 'string', pattern: '^https://'},
                endpoint: {type: 'string'},
              },
            },
          ],
        },
      },
    };
    const data = {
      backend: {},
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['backend'], data);

    expect(schemaAtPath?.required).toEqual(['endpoint']);
  });

  it('returns undefined for a missing object path', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        backend: {
          type: 'object',
          properties: {
            endpoint: {type: 'string'},
          },
        },
      },
    };
    const data = {
      backend: {
        endpoint: 'https://api.openai.com/v1/',
      },
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['doesNotExist'], data);

    expect(schemaAtPath).toBeUndefined();
  });

  it('returns undefined for parent schema when the property path has no object parent', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        endpoint: {type: 'string'},
      },
    };
    const data = {
      endpoint: 'https://api.openai.com/v1/',
    };

    const parentSchema = getParentObjectSchemaAtDataPath(schema, ['endpoint'], data);

    expect(parentSchema?.type).toEqual('object');
  });

  it('returns scalar property schemas at the resolved leaf path', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        endpoint: {type: 'string'},
      },
    };
    const data = {
      endpoint: 'https://api.openai.com/v1/',
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['endpoint'], data);

    expect(schemaAtPath).toEqual({type: 'string'});
  });

  it('falls back to the first declared variant when relay pattern does not validate', () => {
    const schema: TopLevelSchema = {
      type: 'object',
      properties: {
        backend: {
          oneOf: [
            {
              type: 'object',
              required: ['endpoint'],
              additionalProperties: false,
              properties: {
                endpoint: {type: 'string'},
              },
            },
            {
              type: 'object',
              required: ['relay', 'endpoint'],
              additionalProperties: false,
              properties: {
                relay: {type: 'string', pattern: '^https://'},
                endpoint: {type: 'string'},
              },
            },
          ],
        },
      },
    };
    const data = {
      backend: {
        relay: 'http://localhost:8080',
        endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/',
      },
    };

    const schemaAtPath = getObjectSchemaAtDataPath(schema, ['backend'], data);

    expect(schemaAtPath?.required).toEqual(['endpoint']);
  });
});
