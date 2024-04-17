import type {SettingsInterfaceMetaSchema} from '@/settings/settingsTypes';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {META_SCHEMA_SIMPLIFIED} from '@/packaged-schemas/metaSchemaSimplified';

// TODO: auto-suggest or enable features if user loads a schema that requires them
export function buildMetaSchema(metaSchemaSettings: SettingsInterfaceMetaSchema): TopLevelSchema {
  let metaSchema = structuredClone(META_SCHEMA_SIMPLIFIED);

  if (!metaSchemaSettings.allowBooleanSchema) {
    metaSchema.$defs!.jsonSchema = DEF_JSON_SCHEMA_WITHOUT_BOOLEAN_SCHEMA;
  }
  if (!metaSchemaSettings.allowMultipleTypes) {
    metaSchema.$defs!.typeDefinition = DEF_TYPE_DEFINITION_WITHOUT_MULTIPLE_TYPES;
  }
  if (!metaSchemaSettings.showAdditionalPropertiesButton) {
    metaSchema.$defs!.objectSubSchema!.metaConfigurator = {
      hideAddPropertyButton: true,
      // this is needed, because otherwise it would overwrite the advanced status of other properties, making
      // them not advanced anymore (such as the 'if' and 'not' properties)
      advanced: true,
    };
  }
  if (metaSchemaSettings.rootMustBeObject) {
    metaSchema.$defs.rootObjectSubSchema!.allOf.push({
      required: ['type'],
      properties: {
        type: {
          const: 'object',
        },
      },
    });
  }
  if (metaSchemaSettings.objectTypesComfort) {
    metaSchema.$defs.enumProperty.allOf = ALL_OF_ENUM_PROPERTY;
    metaSchema.$defs['meta-data'].allOf = ALL_OF_META_DATA;

    // delete properties that are not compatible with this option
    delete metaSchema.$defs.schemaComposition.properties.not;
    metaSchema.$defs.conditionalSchema = {};
    delete metaSchema.$defs.objectProperty.properties.additionalProperties;
    delete metaSchema.$defs.objectProperty.properties.propertyNames;
    delete metaSchema.$defs.objectProperty.properties.dependentRequired;
    delete metaSchema.$defs.objectProperty.properties.dependentSchemas;
    delete metaSchema.$defs.objectProperty.properties.unevaluatedProperties;
    delete metaSchema.$defs.arrayProperty.properties.unevaluatedItems;

    //TODO: seems like even items in an array does not work with this!
  }

  return metaSchema;
}

const DEF_JSON_SCHEMA_WITHOUT_BOOLEAN_SCHEMA = {
  title: 'Json schema',
  $ref: '#/$defs/objectSubSchema',
  $comment:
    'This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.',
};

const DEF_TYPE_DEFINITION_WITHOUT_MULTIPLE_TYPES = {
  properties: {
    type: {
      $ref: '#/$defs/simpleTypes',
    },
  },
};

const ALL_OF_ENUM_PROPERTY = [
  {
    if: {
      $ref: '#/$defs/hasTypeArray',
    },
    then: {
      properties: {
        const: {
          type: 'array',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeObject',
    },
    then: {
      properties: {
        const: {
          type: 'object',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeString',
    },
    then: {
      properties: {
        const: {
          type: 'string',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeNumberOrInteger',
    },
    then: {
      properties: {
        const: {
          type: 'number',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeBoolean',
    },
    then: {
      properties: {
        const: {
          type: 'boolean',
        },
      },
    },
  },
];

const ALL_OF_META_DATA = [
  {
    if: {
      $ref: '#/$defs/hasTypeArray',
    },
    then: {
      properties: {
        examples: {
          items: {
            type: 'array',
          },
        },
        default: {
          type: 'array',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeObject',
    },
    then: {
      properties: {
        examples: {
          items: {
            type: 'object',
          },
        },
        default: {
          type: 'object',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeString',
    },
    then: {
      properties: {
        examples: {
          items: {
            type: 'string',
          },
        },
        default: {
          type: 'string',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeNumberOrInteger',
    },
    then: {
      properties: {
        examples: {
          items: {
            type: 'number',
          },
        },
        default: {
          type: 'number',
        },
      },
    },
  },
  {
    if: {
      $ref: '#/$defs/hasTypeBoolean',
    },
    then: {
      properties: {
        examples: {
          items: {
            type: 'boolean',
          },
        },
        default: {
          type: 'boolean',
        },
      },
    },
  },
];
