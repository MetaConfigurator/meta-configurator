import {describe, it, expect, beforeEach, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {extractGeneratedDefinitionsFromSubSchema} from '@/schema/schemaManipulationUtils';

vi.mock('@/dataformats/formatRegistry', () => ({
  useDataConverter: () => ({
    stringify: (data: any) => JSON.stringify(data),
    parse: (data: string) => JSON.parse(data),
  }),
}));

describe('extractGeneratedDefinitionsFromSubSchema', () => {
  let rootSchema: ManagedData;

  beforeEach(() => {
    rootSchema = new ManagedData(
      shallowRef({
        type: 'object',
        properties: {
          conservationStatus: {$ref: '#/$defs/ConservationStatus'},
        },
        $defs: {
          ConservationStatus: {
            type: 'string',
            enum: ['Least Concern', 'Endangered', 'Extinct'],
          },
        },
      }),
      SessionMode.SchemaEditor
    );
  });
  it('bundles referenced definitions into sub-schema before sending to AI', () => {
    // manually simulate what bundleReferencedDefinitions does conceptually
    // now AI receives this bundled version, updates it, returns it
    const aiResponse = {
      $ref: '#/$defs/ConservationStatus',
      $defs: {
        ConservationStatus: {
          type: 'string',
          enum: ['Least Concern', 'Endangered', 'Extinct', 'Very Endangered'],
        },
      },
    };

    extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, ['ConservationStatus']);

    // original updated, no duplicate
    expect(rootSchema.data.value.$defs.ConservationStatus.enum).toContain('Very Endangered');
    expect(rootSchema.data.value.$defs.ConservationStatus2).toBeUndefined();
  });
  it('handles sub-schema with no $defs at all', () => {
    // AI returned a plain sub-schema with no definitions — nothing should change at root
    const aiResponse = {
      type: 'string',
      enum: ['Least Concern', 'Endangered'],
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, []);

    expect(result.$defs).toBeUndefined();
    // root schema untouched
    expect(rootSchema.data.value.$defs.ConservationStatus.enum).toEqual([
      'Least Concern',
      'Endangered',
      'Extinct',
    ]);
  });
  it('updates existing root definition when it was bundled and AI modified it', () => {
    const aiResponse = {
      $ref: '#/$defs/ConservationStatus',
      $defs: {
        ConservationStatus: {
          type: 'string',
          enum: ['Least Concern', 'Endangered', 'Extinct', 'Very Endangered'],
        },
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, [
      'ConservationStatus',
    ]);

    expect(result.$defs).toBeUndefined();
    expect(rootSchema.data.value.$defs.ConservationStatus.enum).toContain('Very Endangered');
    expect(rootSchema.data.value.$defs.ConservationStatus2).toBeUndefined();
  });
  it('creates new definition when it was not bundled', () => {
    const aiResponse = {
      $ref: '#/$defs/ConservationStatus',
      $defs: {
        ConservationStatus: {
          type: 'string',
          enum: ['Least Concern', 'Endangered', 'Very Endangered'],
        },
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, []);

    expect(result.$defs).toBeUndefined();
    expect(rootSchema.data.value.$defs.ConservationStatus.enum).not.toContain('Very Endangered');
    expect(rootSchema.data.value.$defs.ConservationStatus2).toBeDefined();
  });
});
