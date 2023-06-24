import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import _ from 'lodash';

import {pathToString} from '@/pathHelper';
import { DEFAULT_CONFIG_DATA } from "@/default_data/DefaultConfigData";

export const dataStore = defineStore('dataStore', () => {
  const configData = ref(DEFAULT_CONFIG_DATA);

  /**
   * The current path in the data tree. List of path keys (or array indices). Empty list for root path.
   */
  const currentPath = ref<(string | number)[]>([]);

  /**
   * Returns the data at the given path.
   * @param path The array of keys to traverse.
   * @returns The data at the given path, or an empty object if the path does not exist.
   * @todo consider using lodash
   */
  function dataAtPath(path: (string | number)[]): any {
    let currentData: any = configData.value;

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
    _.set(configData.value, pathAsString!!, newValue);
  }

  return {
    configData,
    dataAtPath,
    currentPath,
    dataAtCurrentPath: computed(() => dataAtPath(currentPath.value)),
    updateDataAtPath,
  };
});
