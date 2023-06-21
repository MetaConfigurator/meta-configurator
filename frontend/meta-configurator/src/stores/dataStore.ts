import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import _ from 'lodash';
import {pathToString} from '@/pathHelper';

export const dataStore = defineStore('dataStore', () => {
  const configData = ref({
    name: 'test',
    firstName: 'testFirstName',
    isMarried: true,
    telephoneNumber: 152000,
    heightInMeter: 1.7,
    address: {
      street: 'test',
      number: 12,
      zipCode: 'test',
      city: 'test',
      country: 'test',
      moreInfo: {
        info: 'test',
        neighborhood: 'test',
      },
    },
  });

  /**
   * The current path in the data tree.
   */
  const currentPath = ref<string[]>([]);

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
