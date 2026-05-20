import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {
  doesIdenticalSchemaDefinitionExist,
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

  it('reuses an existing matching definition under a different name when duplicate reuse is enabled', () => {
    // existing def is named "vector" but has the same content as the inlined a2 sub-schema
    schemaData.setDataAt(['$defs', 'vector'], {
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
      // candidate name is different from the existing one; the dedupe should still find vector by content
      'a2',
      true
    );

    expect(extractedPath).toEqual(['$defs', 'vector']);
    expect(schemaData.dataAt(['$defs', 'a2'])).toBeUndefined();
    expect(schemaData.dataAt(['properties', 'a', 'properties', 'a2'])).toEqual({
      $ref: '#/$defs/vector',
    });
    expect(schemaData.dataAt(['properties', 'a', 'properties', 'a3'])).toEqual({
      type: 'object',
      $ref: '#/$defs/vector',
    });
  });

  it('collapses identical sub-schemas into a single $defs entry during bulk extraction', () => {
    schemaData = new ManagedData(
      shallowRef({
        type: 'object',
        properties: {
          point1: {
            type: 'object',
            properties: {
              x: {type: 'number'},
              y: {type: 'number'},
            },
          },
          point2: {
            type: 'object',
            properties: {
              x: {type: 'number'},
              y: {type: 'number'},
            },
          },
          point3: {
            // key order differs from point1/point2; deep equality should still consider it equal
            type: 'object',
            properties: {
              y: {type: 'number'},
              x: {type: 'number'},
            },
          },
        },
      }),
      SessionMode.SchemaEditor
    );

    const extractedCount = extractAllInlinedSchemaElements(schemaData, false, false);

    // root is excluded by extractRootElement=false. The 3 inlined point objects should all
    // collapse into a single $defs entry — so only one definition is actually created.
    expect(Object.keys(schemaData.data.value.$defs)).toHaveLength(1);
    const defName = Object.keys(schemaData.data.value.$defs)[0]!;
    const expectedRef = {$ref: `#/$defs/${defName}`};
    expect(schemaData.data.value.properties.point1).toEqual(expectedRef);
    expect(schemaData.data.value.properties.point2).toEqual(expectedRef);
    expect(schemaData.data.value.properties.point3).toEqual(expectedRef);
    // each of the three properties was processed
    expect(extractedCount).toBe(3);
  });

  describe('doesIdenticalSchemaDefinitionExist', () => {
    it('returns the path of an existing definition with deeply equal content', () => {
      schemaData.setDataAt(['$defs', 'foo'], {
        type: 'object',
        properties: {x: {type: 'number'}},
      });

      const match = doesIdenticalSchemaDefinitionExist(schemaData, {
        // keys in different order, but structurally identical
        properties: {x: {type: 'number'}},
        type: 'object',
      });

      expect(match).toEqual(['$defs', 'foo']);
    });

    it('returns undefined when no equivalent definition exists', () => {
      schemaData.setDataAt(['$defs', 'foo'], {type: 'string'});

      const match = doesIdenticalSchemaDefinitionExist(schemaData, {type: 'number'});

      expect(match).toBeUndefined();
    });

    it('returns undefined when there is no $defs section', () => {
      const match = doesIdenticalSchemaDefinitionExist(schemaData, {type: 'string'});
      expect(match).toBeUndefined();
    });

    it('also searches the legacy "definitions" section', () => {
      schemaData.setDataAt(['definitions', 'legacyFoo'], {type: 'object'});

      const match = doesIdenticalSchemaDefinitionExist(schemaData, {type: 'object'});

      expect(match).toEqual(['definitions', 'legacyFoo']);
    });

    it('prefers a $defs match over a definitions match when both exist', () => {
      schemaData.setDataAt(['definitions', 'legacyFoo'], {type: 'string'});
      schemaData.setDataAt(['$defs', 'modernFoo'], {type: 'string'});

      const match = doesIdenticalSchemaDefinitionExist(schemaData, {type: 'string'});

      expect(match).toEqual(['$defs', 'modernFoo']);
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
