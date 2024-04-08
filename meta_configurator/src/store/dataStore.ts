import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import {watchDebounced} from '@vueuse/core';
// @ts-ignore
import {simplifiedMetaSchema} from '../../resources/json-schema/simplifiedMetaSchema_restricted';
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {SessionMode, useSessionStore} from '@/store/sessionStore';
import type {JsonSchemaType} from '@/model/jsonSchemaType';
import {useDataSource} from '@/data/dataSource';

/**
 * The store that contains the data of the current file and the current schema.
 */
export const useDataStore = defineStore('dataStore', () => {
  /**
   * The configuration file that the user can modify
   */
  const fileData = useDataSource().userData;

  /**
   * The json schema as a plain object
   */
  const schemaData: Ref<JsonSchemaType> = useDataSource().userSchemaData;

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

  /**
   * Reloads the schema from the schema editor, i.e., reruns the schema preprocessor.
   */
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
