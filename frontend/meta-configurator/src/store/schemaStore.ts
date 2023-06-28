import {defineStore} from 'pinia';
import {computed, ref} from 'vue';

import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';
import {JsonSchema} from '@/model/JsonSchema';
import {DEFAULT_SCHEMA} from '@/data/DefaultSchema';
import {useCommonStore} from '@/store/commonStore';
import type {Path} from '@/model/path';
import {pathToString} from '@/helpers/pathHelper';
import _ from 'lodash';

/**
 * The store for the active editor schema.
 */
export const useSchemaStore = defineStore('schemaStore', () => {
  const schema = computed(() => new TopLevelJsonSchema(schemaData.value));
  /**
   * The json schema as a plain object.
   */
  const schemaData = ref(DEFAULT_SCHEMA);

  function updateSchemaAtPath(path: Path, newValue: any) {
    const pathAsString = pathToString(path);
    _.set(schemaData.value, pathAsString!!, newValue);
  }

  /**
   * The JSON schema meta schema as a plain object.
   */
  const metaSchemaData = ref({});
  const metaSchema = computed(() => new TopLevelJsonSchema(metaSchemaData.value));

  // load meta schema
  fetch('../../resources/json-schema/schema.json')
    .then(response => response.json())
    .then(metaSchema => (metaSchemaData.value = metaSchema));

  return {
    schema,
    schemaData,
    metaSchema,
    metaSchemaData,
    schemaAtCurrentPath: computed(
      () => schema.value.subSchemaAt(useCommonStore().currentPath) ?? new JsonSchema({})
    ),
    updateSchemaAtPath,
  };
});
