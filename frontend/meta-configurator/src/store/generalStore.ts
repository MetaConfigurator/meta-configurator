import type {Ref} from 'vue';
import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {dataStore} from '@/store/dataStore';
import {schemaStore} from '@/store/schemaStore';
import {pathToString} from '@/helpers/pathHelper';
import _ from 'lodash';
import {JsonSchema} from '@/model/JsonSchema';
import {TopLevelJsonSchema} from '@/model/TopLevelJsonSchema';

export const generalStore = defineStore('generalStore', () => {
  const currentPage = ref('file');

  const dataToDisplay: Ref<any> = getDataToDisplay();
  const schemaToDisplay: Ref<TopLevelJsonSchema> = getSchemaToDisplay();

  /**
   * The current path in the data tree. List of path keys (or array indices). Empty list for root path.
   */
  const currentPath = ref<(string | number)[]>([]);

  function getDataToDisplay(): Ref<any> {
    if (currentPage.value === 'file') {
      return dataStore().configData;
    } else if (currentPage.value === 'schema') {
      return schemaStore().schema;
    } else if (currentPage.value === 'settings') {
      // use settingsStore
    }
    return ref({});
  }

  function getSchemaToDisplay() {
    if (currentPage.value === 'file') {
      return schemaStore().schema;
    } else if (currentPage.value === 'schema') {
      return schemaStore().metaSchema;
    } else if (currentPage.value === 'settings') {
      // use settingsStore
    }
    return ref({});
  }

  /**
   * Returns the data at the given path.
   * @param path The array of keys to traverse.
   * @returns The data at the given path, or an empty object if the path does not exist.
   * @todo consider using lodash
   */
  function dataAtPath(path: (string | number)[]): any {
    let currentData: any = dataToDisplay;

    for (const key of path) {
      if (!currentData[key]) {
        return {};
      }
      currentData = currentData[key];
    }

    return currentData;
  }

  function updateDataAtPath(path: (string | number)[], newValue: any) {
    const pathAsString = pathToString(path);
    _.set(dataToDisplay.value, pathAsString!!, newValue);
  }
  return {
    currentPage,
    dataToDisplay,
    schemaToDisplay,
    currentPath,
    dataAtPath,
    dataToDisplayAtCurrentPath: computed(() => dataAtPath(currentPath.value)),
    schemaAtCurrentPath: computed(
      () => schemaToDisplay.value.subSchemaAt(currentPath.value) ?? new JsonSchema({})
    ),
    updateDataAtPath,
  };
});
