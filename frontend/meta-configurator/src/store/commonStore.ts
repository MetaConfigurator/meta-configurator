import {computed, ref} from 'vue';
import type {Path} from '@/model/path';
import {defineStore} from 'pinia';
import {useSchemaStore} from '@/store/schemaStore';

/**
 * Store for common data.
 */
export const useCommonStore = defineStore('commonStore', () => {
  /**
   * The current path in the data tree. List of path keys (or array indices). Empty list for root path.
   */
  const currentPath = ref<Path>([]);

  function updateCurrentPath(proposedPath: Path) {
    currentPath.value = proposedPath;
    let schema = useSchemaStore().schemaAtCurrentPath;
    if (!schema.hasType('object') && !schema.hasType('array')) {
      currentPath.value = proposedPath.slice(0, -1);
    }
  }

  return {
    currentPath: currentPath,
    updateCurrentPath,
  };
});
