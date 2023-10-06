import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';
import {watchDebounced} from '@vueuse/core';
// @ts-ignore
import {simplifiedMetaSchema} from '../../resources/json-schema/simplifiedMetaSchema';
import {preprocessOneTime} from '@/helpers/schema/oneTimeSchemaPreprocessor';
import {SessionMode, useSessionStore} from '@/store/sessionStore';

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

  const schemaDataPreprocessed = computed(() => preprocessOneTime(schemaData.value));

  /**
   * The json schema as a TopLevelJsonSchema object
   */
  const schema = ref(new TopLevelJsonSchema(schemaDataPreprocessed.value));

  /**
   * The json schema meta schema as a plain object
   */
  const metaSchemaData = ref(preprocessOneTime(simplifiedMetaSchema));

  /**
   * The json schema meta schema as a TopLevelJsonSchema object
   */
  const metaSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(metaSchemaData.value)
  );

  // make sure that the schema is not preprocessed too often
  watchDebounced(schemaData, () => reloadSchema(), {
    debounce: 1000,
    immediate: true,
  });

  function reloadSchema() {
    if (useSessionStore().currentMode === SessionMode.FileEditor) {
      const preprocessedSchema = preprocessOneTime(schemaData.value);
      schema.value = new TopLevelJsonSchema(preprocessedSchema);
    }
  }

  return {
    fileData,
    schema,
    schemaData,
    schemaDataPreprocessed,
    metaSchema,
    metaSchemaData,
    reloadSchema,
  };
});
