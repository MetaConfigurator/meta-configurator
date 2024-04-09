export const SETTINGS_SCHEMA: any = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Settings',
  description: 'MetaConfigurator settings',
  type: 'object',
  additionalProperties: false,
  properties: {
    dataFormat: {
      type: 'string',
      description: 'The data format to use for the configuration files.',
      default: 'json',
      enum: ['json', 'yaml'],
    },
    guiEditorOnRightSide: {
      type: 'boolean',
      description:
        'If enabled, the GUI editor will be on the right side and the code editor on the left. Otherwise, it will be the opposite way.',
      default: true,
    },
    codeEditor: {
      type: 'object',
      description: 'Settings of the code editor.',
      properties: {
        fontSize: {
          type: 'integer',
          description: 'The font size of the code editor.',
          default: 14,
          minimum: 10,
          maximum: 40,
        },
      },
    },
    guiEditor: {
      type: 'object',
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
      additionalProperties: false,
    },
    metaSchema: {
      type: 'object',
      description: 'Meta Schema related settings belong here.',
      properties: {
        simplified: {
          type: 'boolean',
          description:
            'Whether to use the simplified meta schema. The simplified meta schema is a subset of the full meta schema and is easier to understand and use. It is recommended for beginners, however, it does not support all features of the full meta schema. This setting affects the complexity and expressiveness of the GUI editor too.',
          default: true,
        },
      },
      additionalProperties: false,
    },
    debuggingActive: {
      type: 'boolean',
      description: 'If enabled, the internal application state is shown.',
      default: false,
    },
  },
};
