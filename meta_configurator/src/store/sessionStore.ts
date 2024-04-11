import type {Ref} from 'vue';
import {computed, ref, watch} from 'vue';
import type {Path} from '@/model/path';
import {defineStore} from 'pinia';
import {pathToString} from '@/utility/pathUtils';
import type {SearchResult} from '@/utility/search';
import {useCurrentData, useCurrentSchema} from '@/data/useDataLink';
import {SessionMode} from '@/model/sessionMode';
import type {EffectiveSchema} from '@/schema/effectiveSchemaCalculator';

/**
 * Store that manages all data that is specific to the current session,
 * including the current selected path, the validation results, and the current mode.
 */
export const useSessionStore = defineStore('sessionStore', () => {
  /**
   * The current path in the data tree. Empty list for root path.
   */
  const currentPath: Ref<Path> = ref<Path>([]);
  /**
   * The current selected element in the data tree.
   */
  const currentSelectedElement: Ref<Path> = ref<Path>([]);
  /**
   * All elements that are currently expanded in the data tree.
   * The key is the path as a string, the value is true if the element is expanded.
   */
  const currentExpandedElements: Ref<Record<string, boolean>> = ref({});
  /**
   * The current search results. Empty, if there is currently no search.
   */
  const currentSearchResults: Ref<SearchResult[]> = ref<SearchResult[]>([]);

  /**
   * The current mode of the application.
   */
  const currentMode: Ref<SessionMode> = ref<SessionMode>(SessionMode.FileEditor);

  /**
   * The error message of the schema, or null if there is no error.
   * This is the result of the last validation of the schema, not the data.
   */
  const schemaErrorMessage: Ref<string | null> = ref<string | null>(null);

  /**
   * Reset the current selected element and expanded elements when the mode changes.
   */
  watch(
    currentMode,
    () => {
      currentExpandedElements.value = {};
      currentSelectedElement.value = [];
    },
    {immediate: true}
  );

  function updateCurrentPath(proposedPath: Path): void {
    currentPath.value = proposedPath;
    const schema = effectiveSchemaAtCurrentPath.value.schema;
    if (!schema.hasType('object') && !schema.hasType('array')) {
      currentPath.value = proposedPath.slice(0, -1);
    }
  }

  function updateCurrentSelectedElement(proposedElement: Path): void {
    currentSelectedElement.value = proposedElement;
  }

  function isExpanded(path: Path): boolean {
    return currentExpandedElements.value[pathToString(path)] ?? false;
  }

  function expand(path: Path): void {
    const pathAsString = pathToString(path);
    currentExpandedElements.value = {...currentExpandedElements.value, [pathAsString]: true};
  }

  function collapse(path: Path): void {
    const pathAsString = pathToString(path);
    const _currentExpandedElements = {...currentExpandedElements.value};
    delete _currentExpandedElements[pathAsString];
    currentExpandedElements.value = _currentExpandedElements;
  }

  function isHighlighted(path: Path): boolean {
    return currentSearchResults.value.some(p => pathToString(p.path) === pathToString(path));
  }

  const effectiveSchemaAtCurrentPath: Ref<EffectiveSchema> = computed(() =>
    useCurrentSchema().effectiveSchemaAtPath(currentPath.value)
  );

  return {
    currentMode,
    schemaErrorMessage,
    currentPath,
    currentSelectedElement,
    currentExpandedElements,
    currentSearchResults,
    isHighlighted,
    isExpanded,
    expand,
    collapse,
    updateCurrentPath,
    updateCurrentSelectedElement,
    dataAtCurrentPath: computed(() => useCurrentData().dataAt(currentPath.value)),
    schemaAtCurrentPath: computed(() => useCurrentSchema().schemaAtPath(currentPath.value)),
    effectiveSchemaAtCurrentPath,
  };
});
