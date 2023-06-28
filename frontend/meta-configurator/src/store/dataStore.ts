import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import _ from 'lodash';

import {pathToString} from '@/helpers/pathHelper';
import {DEFAULT_CONFIG_DATA} from '@/data/DefaultConfigData';
import type {Path} from '@/model/path';
import {useCommonStore} from '@/store/commonStore';

export const useDataStore = defineStore('dataStore', () => {
  const configData = ref(DEFAULT_CONFIG_DATA);

  /**
   * Returns the data at the given path.
   * @param path The array of keys to traverse.
   * @returns The data at the given path, or an empty object if the path does not exist.
   */
  function dataAtPath(path: Path): any {
    let currentData: any = configData.value;

    for (const key of path) {
      if (!currentData[key]) {
        return {};
      }
      currentData = currentData[key];
    }

    return currentData;
  }

  function updateDataAtPath(path: Path, newValue: any) {
    const pathAsString = pathToString(path);
    _.set(configData.value, pathAsString!!, newValue);
  }

  return {
    configData,
    dataAtPath,
    dataAtCurrentPath: computed(() => dataAtPath(useCommonStore().currentPath)),
    updateDataAtPath,
  };
});
