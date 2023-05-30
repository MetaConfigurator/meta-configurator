import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const dataStore = defineStore('dataStore', () => {
  const configData = ref({
    name: 'test',
    firstName: 'testFirstName',
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
   */
  function dataAtPath(path: string[]): any {
    let currentData: any = configData.value;

    for (const key of path) {
      currentData = currentData[key];
    }

    return currentData;
  }

  return {
    configData,
    dataAtPath,
    currentPath,
    dataAtCurrentPath: computed(() => dataAtPath(currentPath.value)),
  };
});
