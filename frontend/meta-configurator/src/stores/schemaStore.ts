import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { dataStore } from "@/stores/dataStore";
import { TopLevelJsonSchema } from "@/schema/TopLevelJsonSchema";

/**
 * The store for the applied editor schema.
 */
export const schemaStore = defineStore('schemaStore', () => {
  const schema = ref(exampleSchema);

  return {
    schema,
    schemaAtCurrentPath: computed(() => schema.value.subSchemaAt(dataStore().currentPath)),
  };
});

const exampleSchema: TopLevelJsonSchema = new TopLevelJsonSchema({
  type: "object",
  title: "Person",
  description: "A person schema",
  $schema: "http://json-schema.org/draft-2020-12/schema",
  $id: "https://example.com/person.schema.json",
  required: ["name", "firstName"],
  properties: {
    name: {
      type: "string",
      description: "Last name",
      examples: ['Doe'],
    },
    firstName: {
      type: 'string',
      description: 'First name',
      examples: ['John'],
    },
    isMarried: {
      type: 'boolean',
      description: 'Marital Status',
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
              type: "string",
              description: "Time zone",
            },
          },
        },
      },
    },
  },
});
