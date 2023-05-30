import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { dataStore } from '@/stores/dataStore';

export const schemaStore = defineStore('schemaStore', () => {
  const schema = ref(exampleSchema);

  /**
   * Traverses the schema and returns the schema at the given path.
   * @param path The array of keys to traverse.
   */
  const schemaAtPath = (path: string[]) => {
    let currentSchema: any = schema.value;

    for (const key of path) {
      currentSchema = currentSchema.properties[key];
    }
    return currentSchema;
  };

  return {
    schema,
    schemaAtPath,
    schemaAtCurrentPath: computed(() => schemaAtPath(dataStore().currentPath)),
  };
});

const exampleSchema = {
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
        },
        moreInfo: {
          type: 'object',
          description: 'More info about the address',
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
