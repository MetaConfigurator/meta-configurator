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
    // this is the full schema already in the document
    // AI does NOT see this — it only sees the sub-element you selected
    rootSchema = new ManagedData(
      shallowRef({
        type: 'object',
        properties: {
          owner: {$ref: '#/$defs/owner'},
        },
        $defs: {
          breed: {type: 'string', enum: ['Siamese', 'Persian']},
          owner: {type: 'object', properties: {name: {type: 'string'}}},
        },
      }),
      SessionMode.SchemaEditor
    );
  });

  it('moves $defs from AI sub-schema response up to root', () => {
    // AI was scoped to owner, returned this — it put address inside owner.$defs
    const aiResponse = {
      type: 'object',
      properties: {
        name: {type: 'string'},
        address: {$ref: '#/$defs/address'},
      },
      $defs: {
        address: {
          type: 'object',
          properties: {
            street: {type: 'string'},
            city: {type: 'string'},
          },
        },
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema);

    // $defs should be gone from the sub-schema
    expect(result.$defs).toBeUndefined();

    // address should now be at root level
    expect(rootSchema.data.value.$defs.address).toEqual({
      type: 'object',
      properties: {street: {type: 'string'}, city: {type: 'string'}},
    });

    // $ref inside the result should still work
    expect(result.properties.address.$ref).toBe('#/$defs/address');
  });

  it('renames definition if same name already exists at root with different content', () => {
    // root already has an "address" with different content
    rootSchema.setDataAt(['$defs', 'address'], {
      type: 'object',
      properties: {fullAddress: {type: 'string'}},
    });

    // AI generates its own "address" with different content
    const aiResponse = {
      type: 'object',
      properties: {
        contact: {$ref: '#/$defs/address'},
      },
      $defs: {
        address: {
          type: 'object',
          properties: {street: {type: 'string'}, city: {type: 'string'}},
        },
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema);

    // should be renamed to address2 to avoid clash
    expect(rootSchema.data.value.$defs.address2).toEqual({
      type: 'object',
      properties: {street: {type: 'string'}, city: {type: 'string'}},
    });

    // original address untouched
    expect(rootSchema.data.value.$defs.address).toEqual({
      type: 'object',
      properties: {fullAddress: {type: 'string'}},
    });

    // $ref updated to new name
    expect(result.properties.contact.$ref).toBe('#/$defs/address2');
  });

  it('does not duplicate if identical definition already exists at root', () => {
    const addressDef = {
      type: 'object',
      properties: {street: {type: 'string'}, city: {type: 'string'}},
    };

    // root already has exact same address content
    rootSchema.setDataAt(['$defs', 'address'], addressDef);

    const aiResponse = {
      type: 'object',
      properties: {
        contact: {$ref: '#/$defs/address'},
      },
      $defs: {
        address: addressDef, // identical content
      },
    };

    extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema);

    // address2 should NOT have been created
    expect(rootSchema.data.value.$defs.address2).toBeUndefined();
  });

  it('fixes cross references between generated definitions when one gets renamed', () => {
    // root already has a "Foo" so AI-generated Foo will become Foo2
    rootSchema.setDataAt(['$defs', 'Foo'], {type: 'number'});

    // AI generated Bar which references Foo — both are new
    // when Foo becomes Foo2, Bar's internal $ref must also update
    const aiResponse = {
      type: 'object',
      properties: {
        bar: {$ref: '#/$defs/Bar'},
      },
      $defs: {
        Foo: {type: 'string'},
        Bar: {
          type: 'object',
          properties: {
            relatedFoo: {$ref: '#/$defs/Foo'}, // this must become Foo2
          },
        },
      },
    };

    extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema);

    // Foo got renamed to Foo2
    expect(rootSchema.data.value.$defs.Foo2).toEqual({type: 'string'});

    // Bar's internal ref must point to Foo2 not Foo
    expect(rootSchema.data.value.$defs.Bar.properties.relatedFoo.$ref).toBe('#/$defs/Foo2');

    // original Foo (number) untouched
    expect(rootSchema.data.value.$defs.Foo).toEqual({type: 'number'});
  });
});
