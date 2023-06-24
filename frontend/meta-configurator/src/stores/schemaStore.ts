import {defineStore} from 'pinia';
import {computed, ref} from 'vue';

import {dataStore} from '@/stores/dataStore';
import {TopLevelJsonSchema} from '@/schema/TopLevelJsonSchema';
import {JsonSchema} from '@/schema/JsonSchema';
import {DEFAULT_SCHEMA} from "@/defaults/DefaultSchema";

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

