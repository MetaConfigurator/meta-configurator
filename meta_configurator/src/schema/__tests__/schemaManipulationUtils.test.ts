import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowRef} from 'vue';
import {ManagedData} from '@/data/managedData';
import {SessionMode} from '@/store/sessionMode';
import {
  doesIdenticalSchemaDefinitionExist,
  extractAllInlinedSchemaElements,
  extractInlinedSchemaElement,
} from '@/schema/schemaManipulationUtils';
import {
  bundleReferencedDefinitions,
  extractGeneratedDefinitionsFromSubSchema,
  postProcessSchemaModification,
} from '@/schema/schemaDefinitionBundling';

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

function createSchemaModificationRoot(): ManagedData {
  return new ManagedData(
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
}

describe('extractGeneratedDefinitionsFromSubSchema', () => {
  let rootSchema: ManagedData;

  beforeEach(() => {
    rootSchema = createSchemaModificationRoot();
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

  it('does not duplicate if identical definition already exists at root but under different key', () => {
    const addressDef = {
      type: 'object',
      properties: {street: {type: 'string'}, city: {type: 'string'}},
    };

    // root already has exact same address content
    rootSchema.setDataAt(['$defs', 'adresse'], addressDef);

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

    // address should NOT have been created
    expect(rootSchema.data.value.$defs.address).toBeUndefined();

    // reference should point to existing definition
    expect(aiResponse.properties.contact.$ref).toBe('#/$defs/adresse');
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

  it('updates the existing root definition in place when it was bundled and the AI modified it', () => {
    // "breed" was bundled into the sub-schema before sending it to the AI,
    // the AI extended its enum — the change must go back to the original definition
    const aiResponse = {
      $ref: '#/$defs/breed',
      $defs: {
        breed: {type: 'string', enum: ['Siamese', 'Persian', 'Maine Coon']},
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, ['breed']);

    expect(result.$defs).toBeUndefined();
    expect(result.$ref).toBe('#/$defs/breed');
    expect(rootSchema.data.value.$defs.breed.enum).toEqual(['Siamese', 'Persian', 'Maine Coon']);
    // no renamed copy may be created for a bundled definition
    expect(rootSchema.data.value.$defs.breed2).toBeUndefined();
  });

  it('creates a renamed definition when it was not bundled and clashes with an existing one', () => {
    // same AI response as above, but "breed" was NOT bundled — so the modified
    // definition is treated as new and must not overwrite the existing one
    const aiResponse = {
      $ref: '#/$defs/breed',
      $defs: {
        breed: {type: 'string', enum: ['Siamese', 'Persian', 'Maine Coon']},
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, []);

    expect(rootSchema.data.value.$defs.breed.enum).toEqual(['Siamese', 'Persian']);
    expect(rootSchema.data.value.$defs.breed2.enum).toEqual(['Siamese', 'Persian', 'Maine Coon']);
    expect(result.$ref).toBe('#/$defs/breed2');
  });

  it('writes a bundled legacy definition back to the definitions section', () => {
    rootSchema.setDataAt(['definitions', 'legacyBreed'], {type: 'string', enum: ['Siamese']});

    const aiResponse = {
      $ref: '#/definitions/legacyBreed',
      definitions: {
        legacyBreed: {type: 'string', enum: ['Siamese', 'Persian']},
      },
    };

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, [
      'legacyBreed',
    ]);

    expect(result.definitions).toBeUndefined();
    expect(rootSchema.data.value.definitions.legacyBreed.enum).toEqual(['Siamese', 'Persian']);
    // must not be duplicated into $defs
    expect(rootSchema.data.value.$defs.legacyBreed).toBeUndefined();
  });

  it('leaves the sub-schema untouched when it contains no $defs', () => {
    const aiResponse = {type: 'string', enum: ['Least Concern', 'Endangered']};

    const result = extractGeneratedDefinitionsFromSubSchema(aiResponse, rootSchema, []);

    expect(result).toEqual({type: 'string', enum: ['Least Concern', 'Endangered']});
    expect(rootSchema.data.value.$defs.breed.enum).toEqual(['Siamese', 'Persian']);
  });
});

describe('postProcessSchemaModification', () => {
  let rootSchema: ManagedData;

  beforeEach(() => {
    rootSchema = createSchemaModificationRoot();
  });

  it('executes extractGeneratedDefinitionsFromSubSchema and removes $schema property if exists', () => {
    // root already has a "Foo" so AI-generated Foo will become Foo2
    rootSchema.setDataAt(['$defs', 'Foo'], {type: 'number'});

    // AI generated Bar which references Foo — both are new
    // when Foo becomes Foo2, Bar's internal $ref must also update
    const aiResponse = {
      $schema: 'http://json-schema.org/draft-07/schema#',
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

    postProcessSchemaModification(aiResponse, rootSchema);

    // Foo got renamed to Foo2
    expect(rootSchema.data.value.$defs.Foo2).toEqual({type: 'string'});

    // Bar's internal ref must point to Foo2 not Foo
    expect(rootSchema.data.value.$defs.Bar.properties.relatedFoo.$ref).toBe('#/$defs/Foo2');

    // original Foo (number) untouched
    expect(rootSchema.data.value.$defs.Foo).toEqual({type: 'number'});

    // make sure $schema property is removed from the response object
    expect(aiResponse.$schema).toBeUndefined();
  });

  it('passes bundled definition names through so bundled definitions are updated in place', () => {
    const aiResponse = {
      $ref: '#/$defs/breed',
      $defs: {
        breed: {type: 'string', enum: ['Siamese', 'Persian', 'Maine Coon']},
      },
    };

    postProcessSchemaModification(aiResponse, rootSchema, ['breed']);

    expect(rootSchema.data.value.$defs.breed.enum).toEqual(['Siamese', 'Persian', 'Maine Coon']);
    expect(rootSchema.data.value.$defs.breed2).toBeUndefined();
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
      Animal: {
        type: 'object',
        properties: {
          status: {$ref: '#/$defs/ConservationStatus'},
        },
      },
    },
    definitions: {
      LegacyTag: {type: 'string'},
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
    expect(bundledDefinitionNames).toEqual(['ConservationStatus']);
  });

  it('does not bundle definitions that are not referenced', () => {
    const subSchema = {$ref: '#/$defs/ConservationStatus'};

    const {bundledSubSchema} = bundleReferencedDefinitions(subSchema, rootSchemaRaw);

    expect(bundledSubSchema.$defs.Habitat).toBeUndefined();
  });

  it('bundles transitively referenced definitions', () => {
    // Animal references ConservationStatus, so both must be bundled
    const subSchema = {$ref: '#/$defs/Animal'};

    const {bundledSubSchema, bundledDefinitionNames} = bundleReferencedDefinitions(
      subSchema,
      rootSchemaRaw
    );

    expect(bundledSubSchema.$defs.Animal).toEqual(rootSchemaRaw.$defs.Animal);
    expect(bundledSubSchema.$defs.ConservationStatus).toEqual(
      rootSchemaRaw.$defs.ConservationStatus
    );
    expect(bundledDefinitionNames.sort()).toEqual(['Animal', 'ConservationStatus']);
  });

  it('bundles definitions from the legacy definitions section under their original key', () => {
    const subSchema = {$ref: '#/definitions/LegacyTag'};

    const {bundledSubSchema, bundledDefinitionNames} = bundleReferencedDefinitions(
      subSchema,
      rootSchemaRaw
    );

    expect(bundledSubSchema.definitions.LegacyTag).toEqual({type: 'string'});
    expect((bundledSubSchema as any).$defs).toBeUndefined();
    expect(bundledDefinitionNames).toEqual(['LegacyTag']);
  });

  it('bundles each definition only once even if referenced multiple times', () => {
    const subSchema = {
      type: 'object',
      properties: {
        status: {$ref: '#/$defs/ConservationStatus'},
        previousStatus: {$ref: '#/$defs/ConservationStatus'},
      },
    };

    const {bundledDefinitionNames} = bundleReferencedDefinitions(subSchema, rootSchemaRaw);

    expect(bundledDefinitionNames).toEqual(['ConservationStatus']);
  });

  it('bundles the whole definition when a ref points into a part of it', () => {
    const subSchema = {$ref: '#/$defs/Habitat/properties/region'};

    const {bundledSubSchema, bundledDefinitionNames} = bundleReferencedDefinitions(
      subSchema,
      rootSchemaRaw
    );

    expect(bundledSubSchema.$defs.Habitat).toEqual(rootSchemaRaw.$defs.Habitat);
    expect(bundledDefinitionNames).toEqual(['Habitat']);
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

  it('ignores refs that do not point into a definitions section', () => {
    const subSchema = {$ref: '#/properties/somewhere'};

    const {bundledDefinitionNames} = bundleReferencedDefinitions(subSchema, rootSchemaRaw);

    expect(bundledDefinitionNames).toHaveLength(0);
  });
});
