import {defineStore} from 'pinia';
import {ref} from 'vue';

import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';
import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';

/**
 * The store for the active editor schema.
 */
export const schemaStore = defineStore('schemaStore', () => {
  const schema = ref(new TopLevelJsonSchema(DEFAULT_SCHEMA));
  const metaSchema = ref(new TopLevelJsonSchema({}));

  fetch('../../resources/json-schema/schema.json')
    .then((response) => response.json())
    .then((json) => new TopLevelJsonSchema(json))
    .then((schema) => metaSchema.value = schema);

  return {
    schema,
    metaSchema
  };
});
