import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';
import {watchDebounced} from '@vueuse/core';
// @ts-ignore
import {simplifiedMetaSchema} from '../../resources/json-schema/simplifiedMetaSchema';

export const useDataStore = defineStore('dataStore', () => {
  /**
   * The configuration file that the user can modify
   */
  const fileData = ref({});

  /**
   * The json schema as a plain object
   */
  const schemaData = ref({
    title: 'No schema loaded',
    description: 'Go to the schema editor to load a schema.',
  });

  /**
   * The json schema as a TopLevelJsonSchema object
   */
  const schema = ref(new TopLevelJsonSchema(schemaData.value));

  /**
   * The json schema meta schema as a plain object
   */
  const metaSchemaData = ref(simplifiedMetaSchema);

  /**
   * The json schema meta schema as a TopLevelJsonSchema object
   */
  const metaSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(metaSchemaData.value as any)
  );

  // make sure that the schema is not preprocessed too often
  watchDebounced(
    schemaData,
    () => {
      schema.value = new TopLevelJsonSchema(schemaData.value);
    },
    {
      debounce: 1000,
    }
  );

  return {
    fileData,
    schema,
    schemaData,
    metaSchema,
    metaSchemaData,
  };
});
