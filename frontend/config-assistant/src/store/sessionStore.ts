import type {ComputedRef, Ref, WritableComputedRef} from 'vue';
import {computed, ref} from 'vue';
import type {Path} from '@/model/path';
import {defineStore} from 'pinia';
import {useDataStore} from '@/store/dataStore';
import {JsonSchema} from '@/helpers/schema/JsonSchema';
import {dataAt, pathToString} from '@/helpers/pathHelper';
import _ from 'lodash';
import {useSettingsStore} from '@/store/settingsStore';
import type {CodeEditorWrapper} from '@/components/code-editor/CodeEditorWrapper';
import {CodeEditorWrapperUninitialized} from '@/components/code-editor/CodeEditorWrapperUninitialized';
import type {TopLevelJsonSchema} from '@/helpers/schema/TopLevelJsonSchema';
import {ValidationResults, ValidationService} from '@/helpers/validationService';
import {useDebounceFn, watchDebounced} from '@vueuse/core';
import {errorService} from '@/main';
import {GuiConstants} from '@/constants';
import type {SearchResult} from '@/helpers/search';
import {
  calculateEffectiveSchema,
  EffectiveSchema,
} from '@/helpers/schema/effectiveSchemaCalculator';

export enum SessionMode {
  FileEditor = 'file_editor',
  SchemaEditor = 'schema_editor',
  Settings = 'settings',
}
export enum ChangeResponsible {
  None = 'none',
  CodeEditor = 'code_editor',
  GuiEditor = 'gui_editor',
  Routing = 'routing',
  Menubar = 'menubar',
}

/**
 * Store for common data.
 */
export const useSessionStore = defineStore('commonStore', () => {
  /**
   * The current path in the data tree. List of path keys (or array indices). Empty list for root path.
   */
  const currentPath: Ref<Path> = ref<Path>([]);
  const currentSelectedElement: Ref<Path> = ref<Path>([]);
  const currentExpandedElements: Ref<Record<string, boolean>> = ref({});
  const currentSearchResults: Ref<SearchResult[]> = ref<SearchResult[]>([]);
  const currentMode: Ref<SessionMode> = ref<SessionMode>(SessionMode.FileEditor);
  const lastChangeResponsible: Ref<ChangeResponsible> = ref<ChangeResponsible>(
    ChangeResponsible.None
  );
  const currentEditorWrapper: Ref<CodeEditorWrapper> = ref(new CodeEditorWrapperUninitialized());
  /**
   * The error message of the schema, or null if there is no error.
   * This is the result of the last validation of the schema, not the data.
   */
  const schemaErrorMessage: Ref<string | null> = ref<string | null>(null);
  const dataValidationResults: Ref<ValidationResults> = ref<ValidationResults>(
    new ValidationResults([])
  );

  const fileData: WritableComputedRef<any> = computed({
    // getter
    get() {
      switch (currentMode.value) {
        case SessionMode.FileEditor:
          return useDataStore().fileData;

        case SessionMode.SchemaEditor:
          return useDataStore().schemaData;

        case SessionMode.Settings:
          return useSettingsStore().settingsData;

        default:
          throw new Error('Invalid mode');
      }
    },
    // setter
    set(newValue: any) {
      validateDebounced(newValue)
        .then(validationResults => {
          if (validationResults !== undefined) {
            dataValidationResults.value = validationResults;
          }
        })
        .catch(e => errorService.onError(e));

      switch (currentMode.value) {
        case SessionMode.FileEditor:
          useDataStore().fileData = newValue;
          break;

        case SessionMode.SchemaEditor:
          useDataStore().schemaData = newValue;
          break;

        case SessionMode.Settings:
          useSettingsStore().settingsData = newValue;
          break;
      }
    },
  });

  const fileSchema: ComputedRef<TopLevelJsonSchema> = computed(() => {
    switch (currentMode.value) {
      case SessionMode.FileEditor:
        return useDataStore().schema;

      case SessionMode.SchemaEditor:
        return useDataStore().metaSchema;

      case SessionMode.Settings:
        return useSettingsStore().settingsSchema;

      default:
        throw new Error('Invalid mode');
    }
  });

  const fileSchemaData = computed(() => {
    switch (currentMode.value) {
      case SessionMode.FileEditor:
        return useDataStore().schemaData;

      case SessionMode.SchemaEditor:
        return useDataStore().metaSchemaData;

      case SessionMode.Settings:
        return useSettingsStore().settingsSchemaData;

      default:
        throw new Error('Invalid mode');
    }
  });

  const validationService = ref(new ValidationService({}));
  const validateDebounced = useDebounceFn(
    data => validationService.value.validate(data),
    GuiConstants.SCHEMA_VALIDATION_DEBOUNCE_TIME
  );

  /**
   * Update the validation service when the schema changes.
   */
  watchDebounced(
    fileSchemaData,
    () => {
      try {
        validationService.value = new ValidationService(fileSchemaData.value);
        schemaErrorMessage.value = null;
      } catch (e: any) {
        schemaErrorMessage.value = e.message;
      }
    },
    {immediate: true, debounce: GuiConstants.SCHEMA_VALIDATION_DEBOUNCE_TIME}
  );

  function schemaAtPath(path: Path): JsonSchema {
    return fileSchema.value.subSchemaAt(path) ?? new JsonSchema({});
  }

  const schemaAtCurrentPath: Ref<JsonSchema> = computed(() => schemaAtPath(currentPath.value));

  function effectiveSchemaAt(path: Path): EffectiveSchema {
    let currentEffectiveSchema: EffectiveSchema = calculateEffectiveSchema(
      fileSchema.value,
      fileData.value,
      []
    );

    const currentPath = [];
    for (const key of path) {
      currentPath.push(key);
      currentEffectiveSchema = calculateEffectiveSchema(
        currentEffectiveSchema.schema.subSchema(key),
        dataAtPath(currentPath),
        currentPath
      );
    }
    return currentEffectiveSchema;
  }

  const effectiveSchemaAtCurrentPath: Ref<EffectiveSchema> = computed(() =>
    effectiveSchemaAt(currentPath.value)
  );

  /**
   * Returns the data at the given path.
   * @param path The array of keys to traverse.
   * @returns The data at the given path, or an empty object if the path does not exist.
   */
  function dataAtPath(path: Path): any {
    return dataAt(path, fileData.value);
  }

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

  function updateDataAtPath(path: Path, newValue: any): void {
    if (path.length === 0) {
      fileData.value = newValue;
      return;
    }
    const pathAsString = pathToString(path);
    _.set(fileData.value, pathAsString!!, newValue);
  }

  function removeDataAtPath(path: Path): void {
    if (path.length === 0) {
      updateCurrentPath([]);
      updateCurrentSelectedElement([]);
      fileData.value = {};
      return;
    }
    const data = dataAtPath(path.slice(0, -1));
    if (Array.isArray(data)) {
      const indexToRemove = path[path.length - 1] as number;
      data.splice(indexToRemove, 1);
      return;
    }
    const pathAsString = pathToString(path);
    _.unset(fileData.value, pathAsString!!);
  }

  function isExpanded(path: Path): boolean {
    return currentExpandedElements.value[pathToString(path)!!] ?? false;
  }

  function expand(path: Path): void {
    const pathAsString = pathToString(path) ?? '';
    currentExpandedElements.value = {...currentExpandedElements.value, [pathAsString]: true};
  }

  function collapse(path: Path): void {
    const pathAsString = pathToString(path) ?? '';
    const _currentExpandedElements = {...currentExpandedElements.value};
    delete _currentExpandedElements[pathAsString];
    currentExpandedElements.value = _currentExpandedElements;
  }

  function isHighlighted(path: Path): boolean {
    return currentSearchResults.value.some(p => pathToString(p.path) === pathToString(path));
  }

  type AnyObject = {[key: string | symbol]: any};

  /**
   * For adding object item into specific position,
   * use an empty object and an index to compute the object item.
   * If index is found, add it to the position, otherwise, add to the end
   * @returns the object with inserted item
   */
  function insertPropertyAtPosition(obj: AnyObject, key: string, value: any, index?: number) {
    const temp: AnyObject = {};
    let i = 0;

    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        if (i === index && key && value) {
          temp[key] = value;
        }
        // Add the current item in the loop to the temp obj
        temp[prop] = obj[prop];
        i++;
      }
    }

    // If no index, add to the end
    if (!index && key && value) {
      temp[key] = value;
    }
    return temp;
  }

  return {
    currentMode,
    fileData,
    fileSchema,
    fileSchemaData,
    schemaAtPath,
    schemaAtCurrentPath,
    effectiveSchemaAtCurrentPath,
    schemaErrorMessage,
    dataValidationResults,
    validationService,
    dataAtPath,
    dataAtCurrentPath: computed(() => dataAtPath(currentPath.value)),
    currentPath,
    currentSelectedElement,
    currentExpandedElements,
    currentSearchResults,
    isHighlighted,
    isExpanded,
    expand,
    collapse,
    lastChangeResponsible,
    updateCurrentPath,
    updateCurrentSelectedElement,
    updateDataAtPath,
    removeDataAtPath,
    currentEditorWrapper,
    insertPropertyAtPosition,
  };
});
