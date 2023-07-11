import type {TopLevelSchema} from '@/model/JsonSchemaType';

export const DEFAULT_SCHEMA: TopLevelSchema = {
  type: 'object',
  title: 'Person',
  description: 'A person schema',
  $schema: 'http://json-schema.org/draft-2020-12/schema',
  $id: 'https://example.com/person.schema.json',
  required: ['name', 'firstName'],
  properties: {
    name: {
      type: 'string',
      description: 'Last name',
      examples: ['Doe'],
    },
    firstName: {
      type: 'string',
      description: 'First name',
      examples: ['John'],
      deprecated: true,
    },
    nickNames: {
      type: 'array',
      description: 'Nick names',
      items: {
        type: 'string',
      },
    },
    isMarried: {
      type: 'boolean',
      description: 'Marital Status',
    },
    telephoneNumber: {
      type: 'integer',
      description: 'phone number',
      exclusiveMinimum: 149,
      maximum: 159,
    },
    heightInMeter: {
      type: 'number',
      description: 'Height',
      exclusiveMinimum: 1.2,
      maximum: 2.3,
      multipleOf: 0.01,
    },
    address: {
      type: 'object',
      description: 'Address of the person',
      properties: {
        street: {
          type: 'string',
          description: 'Street name',
          examples: ['Main Street'],
        },
        number: {
          type: 'number',
          description: 'Street number',
        },
        city: {
          type: 'string',
          description: 'City name',
        },
        zipCode: {
          type: 'string',
          description: 'Zip code',
          examples: ['12345'],
        },
        country: {
          type: 'string',
          description: 'Country name',
          enum: ['Germany', 'India', 'China', 'America', 'Japan', 'Spain', 'France'],
        },
        moreInfo: {
          type: 'object',
          description: 'More info about the address',
          deprecated: true,
          properties: {
            info: {
              type: 'string',
              description: 'Some info',
            },
            neighborhood: {
              type: 'string',
              description: 'Neighborhood name',
            },
            timeZone: {
              type: 'string',
              description: 'Time zone',
            },
          },
        },
      },
    },
  },
};
