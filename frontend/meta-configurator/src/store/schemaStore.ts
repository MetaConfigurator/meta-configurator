import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {ref} from 'vue';

import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';
import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';

/**
 * The store for the active editor schema.
 */
export const schemaStore = defineStore('schemaStore', () => {
  const schema: Ref<any> = ref<TopLevelJsonSchema>(new TopLevelJsonSchema(DEFAULT_SCHEMA));
  const metaSchema = ref(
    fetch('../../resources/json-schema/schema.json').then(response => response.json())
  );
  return {
    schema,
    metaSchema,
  };
});
