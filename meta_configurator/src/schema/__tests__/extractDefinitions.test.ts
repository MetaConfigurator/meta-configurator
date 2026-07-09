import {describe, it, expect, beforeEach, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {
  extractGeneratedDefinitionsFromSubSchema,
  bundleReferencedDefinitions,
} from '@/schema/schemaManipulationUtils';

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

  it('bundles referenced definition into sub-schema before sending to AI', () => {
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

    expect(rootSchema.data.value.$defs.ConservationStatus.enum).toContain('Very Endangered');
    expect(rootSchema.data.value.$defs.ConservationStatus2).toBeUndefined();
  });

  it('handles sub-schema with no $defs at all', () => {
    const aiResponse = {
      type: 'string',
      enum: ['Least Concern', 'Endangered'],
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, []);

    expect(result.$defs).toBeUndefined();
    expect(rootSchema.data.value.$defs.ConservationStatus.enum).toEqual([
      'Least Concern',
      'Endangered',
      'Extinct',
    ]);
  });
});

describe('bundleReferencedDefinitions', () => {
  const rootSchemaRaw = {
    type: 'object',
    $defs: {
      ConservationStatus: {
        type: 'string',
        enum: ['Least Concern', 'Endangered', 'Extinct'],
      },
      Habitat: {
        type: 'object',
        properties: {region: {type: 'string'}},
      },
    },
  };

  it('bundles referenced definitions into the sub-schema', () => {
    const subSchema = {$ref: '#/$defs/ConservationStatus'};

    const {bundledSubSchema, bundledDefinitionNames} = bundleReferencedDefinitions(
      subSchema,
      rootSchemaRaw
    );

    expect(bundledSubSchema.$defs.ConservationStatus).toEqual({
      type: 'string',
      enum: ['Least Concern', 'Endangered', 'Extinct'],
    });
    expect(bundledDefinitionNames).toContain('ConservationStatus');
  });

  it('does not bundle definitions that are not referenced', () => {
    const subSchema = {$ref: '#/$defs/ConservationStatus'};

    const {bundledSubSchema} = bundleReferencedDefinitions(subSchema, rootSchemaRaw);

    expect(bundledSubSchema.$defs.Habitat).toBeUndefined();
  });

  it('does not modify the original sub-schema', () => {
    const subSchema = {$ref: '#/$defs/ConservationStatus'};

    bundleReferencedDefinitions(subSchema, rootSchemaRaw);

    expect((subSchema as any).$defs).toBeUndefined();
  });

  it('returns empty when sub-schema has no $refs', () => {
    const subSchema = {type: 'string'};

    const {bundledDefinitionNames} = bundleReferencedDefinitions(subSchema, rootSchemaRaw);

    expect(bundledDefinitionNames).toHaveLength(0);
  });

  it('ignores $refs that do not exist in root schema', () => {
    const subSchema = {$ref: '#/$defs/NonExistent'};

    const {bundledSubSchema, bundledDefinitionNames} = bundleReferencedDefinitions(
      subSchema,
      rootSchemaRaw
    );

    expect(bundledDefinitionNames).toHaveLength(0);
    expect((bundledSubSchema as any).$defs).toBeUndefined();
  });
});
