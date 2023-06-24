import {defineStore} from 'pinia';
import {computed, ref} from 'vue';

import {dataStore} from '@/store/dataStore';
import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';
import {JsonSchema} from '@/model/JsonSchema';
import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';

/**
 * The store for the active editor schema.
 */
export const schemaStore = defineStore('schemaStore', () => {
  const schema = ref(new TopLevelJsonSchema(DEFAULT_SCHEMA));

  return {
    schema,
    schemaAtCurrentPath: computed(
      () => schema.value.subSchemaAt(dataStore().currentPath) ?? new JsonSchema({})
    ),
  };
});
