import {defineStore} from 'pinia';
import {computed, ref} from 'vue';

import {dataStore} from '@/stores/dataStore';
import {TopLevelJsonSchema} from '@/schema/model/TopLevelJsonSchema';
import {JsonSchema} from '@/schema/model/JsonSchema';
import {DEFAULT_SCHEMA} from "@/default_data/DefaultSchema";

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

