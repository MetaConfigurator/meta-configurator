import type {TopLevelSchema} from '@/model/JsonSchemaType';

export const DEFAULT_SCHEMA: TopLevelSchema = {
  type: 'object',
  title: 'Person',
  description: 'A person schema',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://example.com/person.schema.json',
  required: ['name', 'firstName'],
  $defs: {
    name: {
      type: 'string',
      description: 'Last name',
      examples: ['Doe'],
    },
  },
  patternProperties: {
    '^Number.*': {
      type: 'number',
      description: 'Any number property',
    },
  },
  if: {
    properties: {
      isMarried: {
        const: true,
      },
    },
    required: ['isMarried'],
  },
  then: {
    properties: {
      spouse: {
        type: 'object',
        description: 'Spouse',
        properties: {
          name: {
            $ref: '#/$defs/name',
          },
          firstName: {
            type: 'string',
            description: 'First name',
          },
        },
      },
    },
  },
  dependentSchemas: {
    nickNames: {
      properties: {
        preferredNickName: {
          type: 'string',
          description: 'Preferred nick name',
        },
      },
    },
  },
  properties: {
    name: {
      $ref: '#/$defs/name',
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
      allOf: [
        {
          properties: {
            street: {
              type: 'string',
              description: 'Street name',
              examples: ['Main Street'],
            },
          },
        },
        {
          properties: {
            number: {
              type: 'number',
              description: 'Street number',
            },
          },
        },
      ],
      dependentRequired: {
        city: ['zipCode'],
      },
      properties: {
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
              description: 'Time zone',
              const: 'UTC',
            },
            booleanArray: {
              type: 'array',
              description: 'Boolean array',
              items: {
                type: 'boolean',
              },
            },
            numbers: {
              type: 'array',
              description: 'Numbers',
              items: {
                type: 'number',
              },
            },
            objects: {
              type: 'array',
              description: 'Objects',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  age: {
                    type: 'number',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
