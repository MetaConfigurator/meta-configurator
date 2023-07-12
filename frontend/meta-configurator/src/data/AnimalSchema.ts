import type {TopLevelSchema} from '@/model/JsonSchemaType';

export const ANIMAL_SCHEMA: TopLevelSchema = {
  type: 'object',
  title: 'Animal',
  description: 'A animal schema',
  $schema: 'http://json-schema.org/draft-2020-12/schema',
  $id: 'https://example.com/animal.schema.json',
  properties: {
    name: {
      type: 'string',
      description: 'Last name',
      examples: ['Doe'],
    },
    nickNames: {
      type: 'array',
      description: 'Nick names',
      items: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            description: 'First name',
          },
        },
      },
    },
    isPet: {
      type: 'boolean',
      description: 'Pet Animal',
    },
    moreInfo: {
      type: 'object',
      description: 'More info about the Animal',
      properties: {
        info: {
          type: 'string',
          description: 'Some info',
        },
        heightInMeter: {
          type: 'number',
          description: 'Height',
          exclusiveMinimum: 1.2,
          maximum: 2.3,
        },
        WeightInKg: {
          type: 'number',
          description: 'Weight',
          exclusiveMinimum: 1.2,
          maximum: 2.3,
        },
      },
    },
  },
};
