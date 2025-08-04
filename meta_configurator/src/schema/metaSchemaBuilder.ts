import type {SettingsInterfaceMetaSchema} from '@/settings/settingsTypes';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {META_SCHEMA_SIMPLIFIED} from '@/packaged-schemas/metaSchemaSimplified';
import {updateSettingsWithDefaults} from '@/settings/settingsUpdater';
import {SETTINGS_DATA_DEFAULT} from '@/settings/defaultSettingsData';

// TODO: auto-suggest or enable features if user loads a schema that requires them
export function buildMetaSchema(metaSchemaSettings: SettingsInterfaceMetaSchema): TopLevelSchema {
  let metaSchema = structuredClone(META_SCHEMA_SIMPLIFIED);

  if (!metaSchemaSettings) {
    // if no settings are provided, use the default settings
    metaSchemaSettings = structuredClone(SETTINGS_DATA_DEFAULT.metaSchema);
  }

  if (!metaSchemaSettings.allowBooleanSchema) {
    metaSchema.$defs!.jsonSchema = DEF_JSON_SCHEMA_WITHOUT_BOOLEAN_SCHEMA;
  }
  if (!metaSchemaSettings.allowMultipleTypes) {
    metaSchema.$defs!.typeDefinition = DEF_TYPE_DEFINITION_WITHOUT_MULTIPLE_TYPES;
  }
  if (!metaSchemaSettings.showAdditionalPropertiesButton) {
    metaSchema.$defs!.objectSubSchema!.metaConfigurator = {
      hideAddPropertyButton: true,
    };
  }

  if (metaSchemaSettings.markMoreFieldsAsAdvanced) {
    metaSchema.$defs!.constProperty!.properties!.const.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.enumProperty!.properties!.enum.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.objectProperty!.properties!.additionalProperties.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.stringProperty!.properties!.maxLength.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.stringProperty!.properties!.minLength.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.stringProperty!.properties!.pattern.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.arrayProperty!.properties!.minItems.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.arrayProperty!.properties!.maxItems.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!.arrayProperty!.properties!.uniqueItems.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!['meta-data']!.properties!.examples.metaConfigurator = {
      advanced: true,
    };
    metaSchema.$defs!['meta-data']!.properties!.default.metaConfigurator = {
      advanced: true,
    };
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
    delete metaSchema.$defs.arrayProperty.properties.items;
  }

  if (metaSchemaSettings.showJsonLdFields) {
    for (const key in JSON_LD_DEFS) {
      const value: any = JSON_LD_DEFS[key];
      metaSchema.$defs[key] = value;
    }
    metaSchema.$defs.rootObjectSubSchema!.allOf! = [
      {
        $ref: '#/$defs/jsonLdContextHaving',
      },
      ...metaSchema.$defs.rootObjectSubSchema!.allOf!,
    ];

    metaSchema.$defs.objectSubSchema!.allOf! = [
      {
        $ref: '#/$defs/jsonLdCommon',
      },
      ...metaSchema.$defs.objectSubSchema!.allOf!,
    ];
  }

  const simplified =
    !metaSchemaSettings.allowBooleanSchema ||
    !metaSchemaSettings.allowMultipleTypes ||
    metaSchemaSettings.objectTypesComfort;
  if (simplified) {
    metaSchema.$defs.jsonMetaSchema.title = 'Simplified JSON Schema Meta Schema';
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

const JSON_LD_DEFS = {
  jsonLdContextHaving: {
    type: 'object',
    title: 'JSON-LD object',
    properties: {
      '@context': {
        title: 'Context',
        oneOf: [
          /*{
            title: 'Overall context',
            $ref: '#/$defs/jsonLdContextElement',
          },*/
          {
            type: 'object',
            title: 'Context elements',
            additionalProperties: {
              title: 'Content element',
              $ref: '#/$defs/jsonLdContextElement',
            },
          },
        ],
      },
    },
  },
  jsonLdContextElement: {
    title: 'Context element',
    oneOf: [
      {
        type: 'string',
        title: 'URI',
        format: 'uri',
      },
      {
        $ref: '#/$defs/jsonLdCommon',
      },
    ],
  },
  jsonLdCommon: {
    title: 'JSON-LD object',
    type: 'object',
    properties: {
      '@id': {
        description:
          'Used to uniquely identify things that are being described in the document with IRIs or blank node identifiers.',
        type: 'string',
        format: 'uri',
        metaConfigurator: {
          ontology: {
            mustBeUri: true,
            mustBeClassOrProperty: true,
          },
        },
      },
      '@type': {
        description: 'Used to set the data type of a node or typed value.',
        type: ['string', 'array'],
        metaConfigurator: {
          ontology: {
            mustBeUri: true,
          },
        },
        items: {
          type: 'string',
          metaConfigurator: {
            ontology: {
              mustBeUri: true,
            },
          },
        },
      },
      '@value': {
        description:
          'Used to specify the data that is associated with a particular property in the graph.',
        type: ['string', 'boolean', 'number'],
        metaConfigurator: {
          advanced: true,
        },
      },

      '@container': {
        description: 'Used to set the default container type for a term.',
        type: ['string'],
        enum: ['@language', '@list', '@index', '@set'],
        metaConfigurator: {
          advanced: true,
        },
      } /*
      '@list': {
        description: 'Used to express an ordered set of data.',
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
            {
              type: 'boolean',
            },
            {
              $ref: '#/$defs/jsonLdCommon',
            },
          ],
        },
        metaConfigurator: {
          advanced: true,
        },
      },
      '@set': {
        description:
          'Used to express an unordered set of data and to ensure that values are always represented as arrays.',
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
            {
              type: 'boolean',
            },
            {
              $ref: '#/$defs/jsonLdCommon',
            },
          ],
        },
        metaConfigurator: {
          advanced: true,
        },
      },
      '@reverse': {
        description: 'Used to express reverse properties.',
        type: ['string', 'object'],
        additionalProperties: {
          anyOf: [
            {
              $ref: '#/$defs/jsonLdCommon',
            },
          ],
        },
        metaConfigurator: {
          advanced: true,
        },
      },
      '@language': {
        description:
            'Used to specify the language for a particular string value or the default language of a JSON-LD document.',
        type: ['string'],
        metaConfigurator: {
          advanced: true,
        },
      },
      '@base': {
        description: 'Used to set the base IRI against which relative IRIs are resolved',
        type: ['string'],
        format: 'uri',
        metaConfigurator: {
          advanced: true,
        },
      },
      '@vocab': {
        description: 'Used to expand properties and values in @type with a common prefix IRI',
        type: ['string'],
        format: 'uri',
        metaConfigurator: {
          advanced: true,
        },
      },*/,
    },
  },
};
