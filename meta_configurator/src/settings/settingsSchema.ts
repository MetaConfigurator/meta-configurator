import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export const SETTINGS_SCHEMA: TopLevelSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Settings',
  description: 'MetaConfigurator settings',
  type: 'object',
  required: ['dataFormat', 'codeEditor', 'guiEditor', 'schemaDiagram', 'metaSchema', 'panels'],
  additionalProperties: false,
  properties: {
    dataFormat: {
      type: 'string',
      description: 'The data format to use for the configuration files.',
      default: 'json',
      enum: ['json', 'yaml'],
    },
    toolbarTitle: {
      type: 'string',
      description: 'The title of the editor, shown in the toolbar.',
      default: 'MetaConfigurator',
    },
    hideSchemaEditor: {
      type: 'boolean',
      description: 'If set to true, the complete schema editor view will be hidden.',
      default: false,
    },
    hideSettings: {
      type: 'boolean',
      description: 'If set to true, the complete settings view will be hidden.',
      default: false,
    },
    uiColors: {
      type: 'object',
      required: ['schemaEditor', 'dataEditor', 'settings'],
      additionalProperties: false,
      description: 'The colors associated with the different panels.',
      properties: {
        schemaEditor: {
          type: 'string',
          description: 'The color associated with panels that represent schema data.',
          default: 'olivedrab',
          format: 'color',
        },
        dataEditor: {
          type: 'string',
          description: 'The color associated with panels that represent file data.',
          default: 'black',
          format: 'color',
        },
        settings: {
          type: 'string',
          description: 'The color associated with panels that represent settings data.',
          default: 'darkmagenta',
          format: 'color',
        },
      },
    },
    codeEditor: {
      type: 'object',
      required: ['fontSize'],
      additionalProperties: false,
      description: 'Settings of the code editor.',
      properties: {
        fontSize: {
          type: 'integer',
          description: 'The font size of the code editor.',
          default: 14,
          minimum: 10,
          maximum: 40,
        },
        tabSize: {
          type: 'integer',
          description: 'The tab size of the code editor.',
          default: 2,
          minimum: 1,
          maximum: 8,
        },
      },
    },
    guiEditor: {
      type: 'object',
      required: ['maximumDepth', 'propertySorting'],
      additionalProperties: false,
      description: 'GUI Editor related settings belong here.',
      properties: {
        maximumDepth: {
          type: 'integer',
          description:
            'The maximum depth of the GUI editor. If the depth of the configuration object is higher, the GUI editor will not show the deeper levels, but they can be navigated by clicking on the property name',
          default: 5,
          minimum: 1,
          maximum: 20,
        },
        propertySorting: {
          type: 'string',
          description:
            "The sorting of the properties in the GUI editor. If set to 'priorityOrder', the order will be required properties first, then optional properties, then additional and pattern properties and finally deprecated properties. If set to 'dataOrder', the properties will be displayed in the order they are in the configuration object. If set to 'schemaOrder', the properties will be sorted according to the order in the schema.",
          default: 'schemaOrder',
          enum: ['priorityOrder', 'schemaOrder', 'dataOrder'],
        },
      },
    },
    schemaDiagram: {
      type: 'object',
      required: [
        'vertical',
        'showAttributes',
        'showEnumValues',
        'maxAttributesToShow',
        'maxEnumValuesToShow',
        'moveViewToSelectedElement',
        'automaticZoomMaxValue',
        'automaticZoomMinValue',
        'mergeAllOfs',
      ],
      additionalProperties: false,
      description: 'Settings of the schema diagram.',
      properties: {
        vertical: {
          type: 'boolean',
          description: 'If set to true, the schema diagram will be displayed vertically.',
          default: true,
        },
        showAttributes: {
          type: 'boolean',
          description:
            'If set to true, the attributes of the schema will be displayed in the schema diagram.',
          default: true,
        },
        showEnumValues: {
          type: 'boolean',
          description:
            'If set to true, the enum values of the schema will be displayed in the schema diagram.',
          default: true,
        },
        maxAttributesToShow: {
          type: 'integer',
          description:
            'The maximum number of attributes to show in the schema diagram. If the number of attributes is higher, they will be hidden.',
          default: 8,
          minimum: 1,
        },
        maxEnumValuesToShow: {
          type: 'integer',
          description:
            'The maximum number of enum values to show in the schema diagram. If the number of enum values is higher, they will be hidden.',
          default: 5,
          minimum: 1,
        },
        moveViewToSelectedElement: {
          type: 'boolean',
          description:
            'If set to true, the view will be moved to the selected element in the schema diagram.',
          default: true,
        },
        automaticZoomMaxValue: {
          type: 'number',
          description:
            'The maximum zoom level of the automatic zoom in the schema diagram, which happens whenever the view moves to a selected element.',
          default: 1,
        },
        automaticZoomMinValue: {
          type: 'number',
          description:
            'The minimum zoom level of the automatic zoom in the schema diagram, which happens whenever the view moves to a selected element.',
          default: 0.5,
        },
        mergeAllOfs: {
          type: 'boolean',
          description:
            'If set to true, allOf schemas will be merged in the schema diagram. This can make the diagram more readable, but sometimes also is not desired, because some information gets lost.',
          default: true,
        },
      },
    },
    metaSchema: {
      type: 'object',
      required: ['allowBooleanSchema', 'allowMultipleTypes', 'objectTypesComfort'],
      additionalProperties: false,
      description:
        'Meta Schema related settings belong here. They affect the functionality of the schema editor. By making the meta schema more expressive (e.g., by allowing multiple data types for a property), the schema editor will be more powerful but also more complicated.',
      properties: {
        allowBooleanSchema: {
          type: 'boolean',
          description:
            "Whether a JSON Schema definition can also be just 'true' or 'false'. Having this option enabled will increase the choices that have to be made when defining a sub-schema in the schema editor.",
          default: false,
        },
        allowMultipleTypes: {
          type: 'boolean',
          description:
            "Whether an object property can be assigned to multiple types (e.g., string and number). Having this option enabled will increase the choices that have to be made when defining the type of an object property in the schema editor, but also allows more flexibility. An alternative to defining multiple types directly is using the 'anyOf' or 'oneOf' keywords.",
          default: false,
        },
        objectTypesComfort: {
          type: 'boolean',
          $comment:
            "Warning: due to incompatibility, this option will disable schema editor support for defining the items of an array, as well as support for many advanced keywords, such as conditionals and 'not'.",
          description:
            'This is a comfort feature: the original JSON Meta Schema allows properties of a particular type to have example values, constant values, default values or enum values of different types. For example, a field for numbers could have a string as a default value. This meta schema option forces the same type for all these values. This enables the tool to auto-select the corresponding type in the schema editor, avoiding the need for the user to manually select the types. ',
          default: false,
          metaConfigurator: {
            advanced: true,
          },
        },
        markMoreFieldsAsAdvanced: {
          type: 'boolean',
          description:
            'If set to true, more fields (e.g., default values, const, enum, examples, string length) will be marked as advanced in the schema editor. This can make the schema editor less cluttered, but also hides some fields that might be needed. Recommended for users who are not familiar with JSON Schema.',
          default: true,
        },
        showAdditionalPropertiesButton: {
          type: 'boolean',
          description:
            'Most schemas allow additional properties (e.g., adding properties to the data, which are not defined in the schema). To support this in the schema editor, it would always provide an "Add Property" button to allow adding properties unknown to the schema. In practice, this option is not used much, but it can confuse the user. For example, they might try adding new fields for their schema by using this button, although that does not have any effect on the schema.',
          default: false,
        },
        showJsonLdFields: {
          type: 'boolean',
          description: 'If set to true, the fields for JSON-LD will be shown in the schema editor.',
          default: false,
        },
      },
    },
    panels: {
      required: ['dataEditor', 'schemaEditor', 'settings'],
      title: 'Panels',
      type: 'object',
      additionalProperties: false,
      description:
        'In this setting the view can be customized: which panels to show in the different modes.',
      properties: {
        dataEditor: {
          $ref: '#/$defs/panels',
        },
        schemaEditor: {
          $ref: '#/$defs/panels',
        },
        settings: {
          allOf: [
            {
              $ref: '#/$defs/panels',
            },
            {
              readOnly: true,
            },
          ],
        },
      },
    },
    rdf: {
      type: 'object',
      required: ['sparqlEndpointUrl'],
      additionalProperties: false,
      description: 'Settings for RDF data.',
      properties: {
        sparqlEndpointUrl: {
          type: 'string',
          description: 'The SPARQL endpoint to use for querying RDF data.',
          default: 'https://dbpedia.org/sparql',
          format: 'uri',
        },
      },
    },
    frontend: {
      type: 'object',
      required: ['hostname'],
      additionalProperties: false,
      description: 'Settings for the frontend.',
      properties: {
        hostname: {
          type: 'string',
          description: 'The hostname of the frontend server.',
          default: 'http://metaconfigurator.informatik.uni-stuttgart.de',
          format: 'uri',
        },
      },
    },
    backend: {
      type: 'object',
      required: ['hostname', 'port'],
      additionalProperties: false,
      description: 'Settings for the backend.',
      properties: {
        hostname: {
          type: 'string',
          description: 'The hostname of the backend server.',
          default: 'http://metaconfigurator.informatik.uni-stuttgart.de',
          format: 'uri',
        },
        port: {
          type: 'integer',
          description: 'The port of the backend server.',
          default: 5000,
          minimum: 1,
          maximum: 65535,
        },
      },
    },
  },
  $defs: {
    panels: {
      type: 'array',
      title: 'Panels',
      description: 'Which panels to show in the editor and their order.',
      items: {
        type: 'object',
        required: ['panelType', 'mode'],
        additionalProperties: false,
        title: 'Panel',
        description: 'Panel type and tool mode.',
        properties: {
          panelType: {
            type: 'string',
            enum: ['guiEditor', 'textEditor', 'schemaDiagram'],
            title: 'Panel Type',
            description: 'Type of panel to display.',
          },
          mode: {
            type: 'string',
            title: 'Mode',
            description: 'The mode determines which kind of data and schema the panel uses.',
            enum: ['schemaEditor', 'dataEditor', 'settings'],
          },
          size: {
            type: 'number',
            title: 'Size',
            description: 'The size of the panel in percent of the total width of the editor.',
            minimum: 10,
          },
        },
        if: {
          properties: {
            panelType: {
              const: 'schemaDiagram',
            },
          },
        },
        then: {
          properties: {
            mode: {
              const: 'schemaEditor',
            },
          },
        },
      },
    },
  },
};
