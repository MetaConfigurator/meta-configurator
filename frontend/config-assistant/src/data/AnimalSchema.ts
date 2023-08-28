import type {TopLevelSchema} from '@/model/JsonSchemaType';

export const ANIMAL_SCHEMA: TopLevelSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Animal',
  description: 'A Animal schema',
  type: 'object',
  properties: {
    animalname: {
      type: 'string',
    },
    species: {
      type: 'string',
      enum: ['Dog', 'Cat', 'Bird', 'Fish'],
    },
    age: {
      type: 'integer',
      minimum: 0,
    },
    color: {
      type: 'string',
    },
    weight: {
      type: 'number',
      minimum: 0,
    },
    isCarnivorous: {
      type: 'boolean',
    },
    habitat: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
        location: {
          type: 'string',
        },
      },
    },
    diet: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          foodName: {
            type: 'string',
          },
          amount: {
            type: 'number',
            minimum: 0,
          },
        },
        required: ['foodName', 'amount'],
      },
    },
  },
  required: ['name', 'species'],
};
