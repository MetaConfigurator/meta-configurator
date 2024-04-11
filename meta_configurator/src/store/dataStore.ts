import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import {watchDebounced} from '@vueuse/core';
// @ts-ignore
import {preprocessOneTime} from '@/schema/oneTimeSchemaPreprocessor';
import {useSessionStore} from '@/store/sessionStore';
import type {JsonSchemaType} from '@/model/jsonSchemaType';
import {useDataSource} from '@/data/dataSource';
import {SessionMode} from '@/model/sessionMode';
import {META_SCHEMA_SIMPLIFIED} from '@/packaged-schemas/metaSchemaSimplified';
import {META_SCHEMA_SIMPLIFIED_RESTRICTED} from '@/packaged-schemas/metaSchemaSimplifiedRestricted';

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
  const metaSchemaData = ref(preprocessOneTime(META_SCHEMA_SIMPLIFIED));

  /**
   * The json schema meta schema (restricted) as a plain object
   */
  const metaSchemaRestrictedData = ref(preprocessOneTime(META_SCHEMA_SIMPLIFIED_RESTRICTED));

  /**
   * The json schema meta schema as a TopLevelJsonSchema object
   */
  const metaSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(metaSchemaData.value)
  );
  /**
   * The json schema meta schema (restricted) as a TopLevelJsonSchema object
   */
  const metaSchemaRestricted: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(metaSchemaRestrictedData.value)
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
    metaSchemaRestricted,
    metaSchemaData,
    metaSchemaRestrictedData,
    reloadSchema,
  };
});
