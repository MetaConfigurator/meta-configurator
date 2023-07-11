import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {DEFAULT_CONFIG_DATA} from '@/data/DefaultConfigData';
import {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';
import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';
import type {JsonSchemaType} from '@/model/JsonSchemaType';
import {preprocessSchema} from '@/helpers/schema/schemaPreprocessor';

export const useDataStore = defineStore('dataStore', () => {
  /**
   * The configuration file that the user can modify
   */
  const fileData = ref(DEFAULT_CONFIG_DATA);

  /**
   * The json schema as a plain object
   */
  const schemaData = ref(DEFAULT_SCHEMA);

  /**
   * The json schema as a TopLevelJsonSchema object
   */
  const schema = ref(new TopLevelJsonSchema(schemaData.value));

  /**
   * The json schema meta schema as a TopLevelJsonSchema object
   */
  const metaSchema: Ref<TopLevelJsonSchema> = computed(
    () => new TopLevelJsonSchema(metaSchemaData.value)
  );

  /**
   * The json schema meta schema as a plain object
   */
  const metaSchemaData = ref({});

  // load meta schema
  fetch('../../resources/json-schema/schema.json')
    .then(response => response.json())
    .then(metaSchema => (metaSchemaData.value = metaSchema));

  // make sure that the schema is not updated too often
  //watchDebounced(schemaData, preprocessDataSchema,
  //  { debounce: 5_000, maxWait: 30_000 });

  function preprocessDataSchema(schemaObject: JsonSchemaType) {
    preprocessSchema(schemaObject)
      .then(schemaObject => schema.value = new TopLevelJsonSchema(schemaObject))
      // TODO implement a proper error handling
      .catch(error => console.error(error));
  }

  return {
    fileData,
    schema,
    schemaData,
    metaSchema,
    metaSchemaData,
  };
});
