import type {OneOfAnyOfSelectionOption} from '@/store/oneOfAnyOfSelectionOption';
import {defineStore} from 'pinia';
import type {Ref} from 'vue';
import {ref} from 'vue';
import type {Path} from '@/utility/path';
import {pathToString} from '@/utility/pathUtils';

/**
 * Store that manages all user selections in the schema, i.e., the selected options for oneOfs, anyOfs, and type unions.
 */
export const useUserSchemaSelectionStore = defineStore('userSchemaSelection', () => {
  /**
   * Selected options for oneOf in the schema.
   * Key is the path as a string, value is the selected option.
   */
  const currentSelectedOneOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for type unions in the schema.
   * Key is the path as a string, value is the selected option.
   */
  const currentSelectedTypeUnionOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for anyOf in the schema.
   * Key is the path as a string, value is an array of selected options.
   */
  const currentSelectedAnyOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption[]>> = ref(
    new Map<string, OneOfAnyOfSelectionOption[]>([])
  );

  function getSelectedOneOfOption(path: Path): OneOfAnyOfSelectionOption | undefined {
    return currentSelectedOneOfOptions.value.get(pathToString(path));
  }

  function getSelectedTypeUnionOption(path: Path): OneOfAnyOfSelectionOption | undefined {
    return currentSelectedTypeUnionOptions.value.get(pathToString(path));
  }

  function getSelectedAnyOfOptions(path: Path): OneOfAnyOfSelectionOption[] | undefined {
    return currentSelectedAnyOfOptions.value.get(pathToString(path));
  }

  function setSelectedOneOfOption(path: Path, option: OneOfAnyOfSelectionOption): void {
    currentSelectedOneOfOptions.value.set(pathToString(path), option);
  }

  function setSelectedTypeUnionOption(path: Path, option: OneOfAnyOfSelectionOption): void {
    currentSelectedTypeUnionOptions.value.set(pathToString(path), option);
  }

  function setSelectedAnyOfOptions(path: Path, options: OneOfAnyOfSelectionOption[]): void {
    currentSelectedAnyOfOptions.value.set(pathToString(path), options);
  }

  return {
    currentSelectedOneOfOptions,
    currentSelectedTypeUnionOptions,
    currentSelectedAnyOfOptions,
    getSelectedOneOfOption,
    getSelectedTypeUnionOption,
    getSelectedAnyOfOptions,
    setSelectedOneOfOption,
    setSelectedTypeUnionOption,
    setSelectedAnyOfOptions,
  };
});
