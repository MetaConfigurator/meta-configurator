import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export const SETTINGS_SCHEMA: TopLevelSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Settings',
  description: 'MetaConfigurator settings',
  type: 'object',
  required: ['dataFormat', 'codeEditor', 'guiEditor', 'schemaDiagram', 'metaSchema', 'panels'],
  additionalProperties: false,
  properties: {
    settingsVersion: {
      type: 'string',
      description: 'The version of the settings file.',
      default: '1.0.2',
      enum: ['1.0.0', '1.0.1', '1.0.2'],
      readOnly: true,
    },
    latestNewsHash: {
      type: 'integer',
      description:
        'The hash of the current news. This is used to determine if the news has changed since the last time the settings were loaded.',
      default: 0,
      readOnly: true,
    },
    dataFormat: {
      type: 'string',
      description: 'The data format to use for the configuration files.',
      default: 'json',
      enum: ['json', 'yaml', 'xml'],
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
    performance: {
      type: 'object',
      required: [
        'maxDocumentSizeForValidation',
        'maxDocumentSizeForCursorSynchronization',
        'maxDocumentSizeForSchemaInference',
        'minObjectPropertyCountToPreserve',
        'maxShownChildrenInGuiEditor',
      ],
      additionalProperties: false,
      description: 'Performance related settings belong here.',
      properties: {
        maxDocumentSizeForValidation: {
          type: 'integer',
          description:
            'The maximum size of the document to validate in bytes. If the document is larger, it will not be validated.',
          default: 1000000, // 1 MB
          minimum: 1000,
        },
        maxDocumentSizeForCursorSynchronization: {
          type: 'integer',
          description:
            'The maximum size of the document to synchronize the cursor position in bytes. If the document is larger, the cursor position will not be synchronized.',
          default: 1000000, // 1 MB
          minimum: 1000,
        },
        maxDocumentSizeForSchemaInference: {
          type: 'integer',
          description:
            'The maximum size of the document to infer the schema from in bytes. If the document is larger, a smart algorithm is used to trim the document first and then infer the schema from the smaller, trimmed input document.',
          default: 250000, // 250 KB
          minimum: 1000,
        },
        minObjectPropertyCountToPreserve: {
          type: 'integer',
          description:
            'When large documents are trimmed, this is the minimum count of object properties to be preserved. This is used to avoid trimming too much data from objects with many properties. The value can be increased in this setting if in your application more properties are cut than desired during the performance optimization.',
          default: 16,
          minimum: 16,
        },
        maxShownChildrenInGuiEditor: {
          type: 'integer',
          description:
            'The maximum amount of child nodes to be shown in the GUI editor per parent node. If the document has more children than this value, those will not be shown in the GUI editor, but still exist in the document and can be edited by other panels.',
          default: 50,
          minimum: 5,
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
        showFormatSelector: {
          type: 'boolean',
          description:
            'If set to true, a dropdown for selecting the format (JSON or YAML) will be shown in the code editor.',
          default: true,
        },
        xml: {
          type: 'object',
          required: ['attributeNamePrefix'],
          additionalProperties: false,
          description: 'Settings for the XML format  in the code editor.',
          properties: {
            attributeNamePrefix: {
              type: 'string',
              description: 'The prefix for attributes in the XML format.',
              default: '_',
            },
          },
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
        hideAddPropertyButton: {
          type: 'boolean',
          description:
            'If set to true, the button for adding custom (not defined by the schema) properties in the GUI editor will be hidden. By default, every schema object allows any additional properties, however, showing this option in the GUI is often not desired as it would only confuse the user. If a particular schema is defined for additional properties, other than "true", then the button will not be hidden.',
          default: true,
        },
        showBorderAroundInputFields: {
          type: 'boolean',
          description:
            'If set to true, the input fields in the GUI editor will have a border around them. This can make the GUI editor more readable, but also can make it look cluttered.',
          default: false,
        },
      },
    },
    schemaDiagram: {
      type: 'object',
      required: [
        'editMode',
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
        editMode: {
          type: 'boolean',
          description:
            'If set to true, the schema diagram will be in edit mode, allowing the user to change the schema by clicking on the elements. If set to false, the schema diagram will be in view mode, showing the schema without the possibility to change it.',
          default: true,
        },
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
          $comment:
            'Warning: has undefined behavior when merging multiple allOfs using the "$ref" keyword.',
          default: false,
        },
      },
    },
    documentation: {
      description: 'Settings of the documentation view.',
      type: 'object',
      required: [
        'mergeAllOfs',
        'enumMaxCountToShowWithoutSpoiler',
        `repeatMultipleOccurrencesInTableOfContents`,
      ],
      properties: {
        mergeAllOfs: {
          type: 'boolean',
          description:
            'If set to true, allOf schemas will be merged in the documentation view. This can make the documentation more readable, but sometimes also is not desired, because some information gets lost.',
          $comment:
            'Warning: has undefined behavior when merging multiple allOfs using the "$ref" keyword.',
          default: true,
        },
        enumMaxCountToShowWithoutSpoiler: {
          type: 'integer',
          description:
            'For an enumeration, when the number of values exceeds this maximum, instead of showing all enum values directly, they are hidden behind a spoiler and can be expanded/collapsed.',
          default: 10,
          minimum: 0,
        },
        repeatMultipleOccurrencesInTableOfContents: {
          type: 'boolean',
          description:
            'If set to true, the table of contents will show multiple occurrences of the same schema element. Some schemas refer to the same sub-schema multiple times, and this option allows the table of contents to show each occurrence separately. If set to false, only the first occurrence will be shown in the table of contents.',
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
        hidden: {
          type: 'array',
          title: 'Hide Panels',
          description:
            'Panels that should be hidden in the editor and not shown to the user. By default, this section contains debugging and experimental panels.',
          items: {
            type: 'string',
            enum: [
              'aiPrompts',
              'debug',
              'test',
              'schemaDiagram',
              'guiEditor',
              'textEditor',
              'tableView',
              'documentation',
            ],
          },
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
          default:
            process.env.FRONTEND_HOSTNAME || 'https://metaconfigurator.github.io/meta-configurator',
          format: 'uri',
        },
      },
    },
    backend: {
      type: 'object',
      required: ['hostname'],
      additionalProperties: false,
      description: 'Settings for the backend.',
      properties: {
        hostname: {
          type: 'string',
          description: 'The hostname of the backend server.',
          default: 'https://metaconfigurator.informatik.uni-stuttgart.de',
          format: 'uri',
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
    aiIntegration: {
      type: 'object',
      required: ['model', 'maxTokens', 'temperature', 'endpoint'],
      additionalProperties: false,
      description: 'Settings for AI API.',
      properties: {
        model: {
          type: 'string',
          description: 'The model to use for the AI API.',
          default: 'gpt-4o-mini',
          examples: ['gpt-4o-mini', 'gpt-4o'],
        },
        maxTokens: {
          type: 'integer',
          description: 'The maximum number of tokens to generate.',
          default: 5000,
          minimum: 1,
        },
        temperature: {
          type: 'number',
          description: 'The sampling temperature for the AI API.',
          default: 0.0,
          minimum: 0.0,
          maximum: 1.0,
        },
        endpoint: {
          type: 'string',
          description:
            'The endpoint to use for the AI API. Must follow the OpenAI API specification.',
          default: 'https://api.openai.com/v1/',
          examples: [
            'https://api.openai.com/v1/',
            'https://api.helmholtz-blablador.fz-juelich.de/v1/',
          ],
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
            enum: [
              'guiEditor',
              'textEditor',
              'schemaDiagram',
              'aiPrompts',
              'tableView',
              'documentation',
            ],
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
