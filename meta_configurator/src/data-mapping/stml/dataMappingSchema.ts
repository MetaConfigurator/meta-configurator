import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export const DATA_MAPPING_SCHEMA: TopLevelSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Data Mapping Config',
  description: 'Configuration for data mapping and transformations.',
  properties: {
    mappings: {
      title:
        'Mappings from source instance to target instance. Any mappings that are not specified here will be ignored and the corresponding values from the source document will not be ported over to the target document',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sourcePath: {
            type: 'string',
            title: 'Path to the source data, a JSON pointer.',
            description:
              'The path to the source data in the input JSON document. The path should be a valid JSON pointer, and it can include array indices using the format %INDEX_[A-Z]%. For example, /people/%INDEX_A%/firstName. The %INDEX_A% placeholder represents a path that is an array and the index will be replaced with the actual index of the item in the array during the data conversion.',
            pattern: '^#?/[^/]+(/%INDEX_[A-Z]+)?(/[^/]+(/%INDEX_[A-Z]+)*)*$',
          },
          targetPath: {
            type: 'string',
            title: 'Path to the target data, a JSON pointer.',
            description:
              'The path to the target data in the output JSON document. The path should be a valid JSON pointer, and it can include array indices using the format %INDEX_[A-Z]%. For example, /person/%INDEX_A%/given_name. The %INDEX_A% placeholder represents a path that is an array and the index will be replaced with the actual index of the item in the array during the data conversion.',
            pattern: '^#?/[^/]+(/%INDEX_[A-Z]+)?(/[^/]+(/%INDEX_[A-Z]+)*)*$',
          },
        },
        required: ['sourcePath', 'targetPath'],
      },
    },
    transformations: {
      type: 'array',
      title: 'Transformations to apply to the source data before mapping.',
      description:
        'Transformations to apply to the source data before mapping. Each transformation will be applied to the source data before the mapping is performed. The transformations are applied in the order they are specified in this array.',
      items: {
        type: 'object',
        properties: {
          operationType: {
            type: 'string',
            enum: ['function', 'valueMapping'],
          },
          sourcePath: {
            type: 'string',
            pattern: '^#?/[^/]+(/%INDEX_[A-Z]+)?(/[^/]+(/%INDEX_[A-Z]+)*)*$',
          },
          function: {
            type: 'string',
            maxLength: 255,
          },
          valueMapping: {
            type: 'object',
            additionalProperties: {},
          },
        },
        required: ['operationType', 'sourcePath'],
        anyOf: [
          {
            description: 'Any JavaScript function. The original value is provided as variable "x".',
            examples: ['x + 1', 'x * 2', 'x.toUpperCase()'],
            required: ['function'],
            properties: {
              operationType: {
                const: 'function',
              },
            },
          },
          {
            required: ['valueMapping'],
            properties: {
              operationType: {
                const: 'valueMapping',
              },
            },
          },
        ],
      },
    },
  },
  required: ['mappings', 'transformations'],
};

export const DATA_MAPPING_EXAMPLE_CONFIG = {
  mappings: [
    {
      sourcePath: '/people/%INDEX_A%/firstName',
      targetPath: '/person/%INDEX_A%/given_name',
    },
    {
      sourcePath: '/people/%INDEX_A%/lastName',
      targetPath: '/person/%INDEX_A%/family_name',
    },
    {
      sourcePath: '/people/%INDEX_A%/age',
      targetPath: 'person/%INDEX_A%/age',
    },
    {
      sourcePath: '/people/%INDEX_A%/marriageStatus',
      targetPath: '/person/%INDEX_A%/married',
    },
  ],
  transformations: [
    {
      operationType: 'mathFormula',
      sourcePath: '/people/%INDEX_A%/age',
      function: 'x + 1',
    },
    {
      operationType: 'valueMapping',
      sourcePath: '/people/%INDEX_A%/marriageStatus',
      valueMapping: {
        0: false,
        1: true,
      },
    },
  ],
};
