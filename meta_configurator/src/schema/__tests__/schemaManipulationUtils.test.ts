import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {
  extractAllInlinedSchemaElements,
  extractInlinedSchemaElement,
} from '@/schema/schemaManipulationUtils';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('schemaManipulationUtils', () => {
  let schemaData: ManagedData;

  beforeEach(() => {
    schemaData = new ManagedData(
      shallowRef({
        type: 'object',
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
                $ref: '#/properties/a/properties/a2',
              },
            },
          },
          b: {
            type: 'object',
            $ref: '#/properties/a',
          },
          c: {
            type: 'string',
            $ref: '#/properties/a/properties/a1',
          },
        },
      }),
      SessionMode.SchemaEditor
    );
  });

  it('extracts an inlined schema into $defs and rewrites references to the extracted path', () => {
    const extractedPath = extractInlinedSchemaElement(
      ['properties', 'a', 'properties', 'a2'],
      schemaData,
      'a2'
    );

    expect(extractedPath).toEqual(['$defs', 'a2']);
    expect(schemaData.data.value).toEqual({
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            a1: {
              type: 'object',
            },
            a2: {
              $ref: '#/$defs/a2',
            },
            a3: {
              type: 'object',
              $ref: '#/$defs/a2',
            },
          },
        },
        b: {
          type: 'object',
          $ref: '#/properties/a',
        },
        c: {
          type: 'string',
          $ref: '#/properties/a/properties/a1',
        },
      },
      $defs: {
        a2: {
          type: 'object',
          properties: {
            a2a: {
              type: 'string',
            },
          },
        },
      },
    });
  });

  it('reuses an existing matching definition when duplicate reuse is enabled', () => {
    schemaData.setDataAt(['$defs', 'sharedObject'], {
      type: 'object',
      properties: {
        a2a: {
          type: 'string',
        },
      },
    });

    const extractedPath = extractInlinedSchemaElement(
      ['properties', 'a', 'properties', 'a2'],
      schemaData,
      'sharedObject',
      true
    );

    expect(extractedPath).toEqual(['$defs', 'sharedObject']);
    expect(schemaData.data.value).toEqual({
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            a1: {
              type: 'object',
            },
            a2: {
              $ref: '#/$defs/sharedObject',
            },
            a3: {
              type: 'object',
              $ref: '#/$defs/sharedObject',
            },
          },
        },
        b: {
          type: 'object',
          $ref: '#/properties/a',
        },
        c: {
          type: 'string',
          $ref: '#/properties/a/properties/a1',
        },
      },
      $defs: {
        sharedObject: {
          type: 'object',
          properties: {
            a2a: {
              type: 'string',
            },
          },
        },
      },
    });
  });

  it('extracts inlined subschemas that are nested inside an existing $defs entry', () => {
    schemaData = new ManagedData(
      shallowRef({
        type: 'object',
        properties: {
          vehicle: {
            $ref: '#/$defs/vehicle',
          },
        },
        $defs: {
          vehicle: {
            type: 'object',
            properties: {
              path: {
                type: 'object',
                properties: {
                  waypoint: {
                    type: 'string',
                  },
                },
              },
              pathCopy: {
                $ref: '#/$defs/vehicle/properties/path',
              },
            },
          },
        },
      }),
      SessionMode.SchemaEditor
    );

    const extractedCount = extractAllInlinedSchemaElements(schemaData, false, true);

    expect(extractedCount).toBe(1);
    expect(schemaData.data.value).toEqual({
      type: 'object',
      properties: {
        vehicle: {
          $ref: '#/$defs/vehicle',
        },
      },
      $defs: {
        vehicle: {
          type: 'object',
          properties: {
            path: {
              $ref: '#/$defs/path',
            },
            pathCopy: {
              $ref: '#/$defs/path',
            },
          },
        },
        path: {
          type: 'object',
          properties: {
            waypoint: {
              type: 'string',
            },
          },
        },
      },
    });
  });
});
