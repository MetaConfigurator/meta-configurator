import type {ComputedRef, Ref, WritableComputedRef} from 'vue';
import {computed, ref, watch} from 'vue';
import type {Path} from '@/model/path';
import {defineStore} from 'pinia';
import {useDataStore} from '@/store/dataStore';
import {JsonSchema} from '@/schema/jsonSchema';
import {dataAt, pathToString} from '@/utility/pathUtils';
import _ from 'lodash';
import {useSettingsStore} from '@/store/settingsStore';
import type {CodeEditorWrapper} from '@/components/code-editor/codeEditorWrapper';
import {CodeEditorWrapperUninitialized} from '@/components/code-editor/codeEditorWrapperUninitialized';
import type {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import {ValidationResults, ValidationService} from '@/utility/validationService';
import {useDebounceFn} from '@vueuse/core';
import {errorService} from '@/main';
import {GuiConstants} from '@/constants';
import type {SearchResult} from '@/utility/search';
import {calculateEffectiveSchema, EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import type {OneOfAnyOfSelectionOption} from '@/model/oneOfAnyOfSelectionOption';
import type {JsonSchemaType} from '@/model/jsonSchemaType';

/**
 * The current page/mode of the application.
 */
export enum SessionMode {
  FileEditor = 'file_editor',
  SchemaEditor = 'schema_editor',
  Settings = 'settings',
}

/**
 * The last responsible for a change in the data.
 */
export enum ChangeResponsible {
  None = 'none',
  CodeEditor = 'code_editor',
  GuiEditor = 'gui_editor',
  Routing = 'routing',
  Menubar = 'menubar',
}

/**
 * Store that manages all data that is specific to the current session,
 * including the current selected path, the validation results, and the current mode.
 */
export const useSessionStore = defineStore('commonStore', () => {
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
   * Selected options for oneOf in the schema.
   * Key is the path as a string, value is the selected option.
   */
  const currentSelectedOneOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption>> = ref(
    new Map<string, OneOfAnyOfSelectionOption>([])
  );
  /**
   * Selected options for anyOf in the schema.
   * Key is the path as a string, value is an array of selected options.
   */
  const currentSelectedAnyOfOptions: Ref<Map<string, OneOfAnyOfSelectionOption[]>> = ref(
    new Map<string, OneOfAnyOfSelectionOption[]>([])
  );

  /**
   * The current mode of the application.
   */
  const currentMode: Ref<SessionMode> = ref<SessionMode>(SessionMode.FileEditor);

  /**
   * The last responsible for a change in the data.
   */
  const lastChangeResponsible: Ref<ChangeResponsible> = ref<ChangeResponsible>(
    ChangeResponsible.None
  );

  /**
   * Wrapper for the code editor.
   */
  const currentEditorWrapper: Ref<CodeEditorWrapper> = ref(new CodeEditorWrapperUninitialized());

  /**
   * The error message of the schema, or null if there is no error.
   * This is the result of the last validation of the schema, not the data.
   */
  const schemaErrorMessage: Ref<string | null> = ref<string | null>(null);

  /**
   * The results of the last validation of the data.
   */
  const dataValidationResults: Ref<ValidationResults> = ref<ValidationResults>(
    new ValidationResults([])
  );

  /**
   * The content of the editor as a string.
   */
  const editorContentUnparsed: Ref<string> = ref('');

  /**
   * The data of the current file, schema, or settings, depending on the current mode.
   */
  const fileData: WritableComputedRef<any> = computed({
    // getter
    get() {
      const settingsData = useSettingsStore().settingsData;
      const schemaData = useDataStore().schemaData;
      const fileData = useDataStore().fileData;
      switch (currentMode.value) {
        case SessionMode.FileEditor:
          return fileData;

        case SessionMode.SchemaEditor:
          return schemaData;

        case SessionMode.Settings:
          return settingsData;

        default:
          throw new Error('Invalid mode');
      }
    },
    // setter
    set(newValue: any) {
      runValidation(newValue);

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

  /**
   * The schema of the current file, schema, or settings, depending on the current mode.
   */
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

  /**
   * The preprocessed schema of the current file, schema, or settings, depending on the current mode.
   */
  const fileSchemaDataPreprocessed: ComputedRef<JsonSchemaType> = computed(() => {
    switch (currentMode.value) {
      case SessionMode.FileEditor:
        return useDataStore().schemaDataPreprocessed;

      case SessionMode.SchemaEditor:
        return useDataStore().metaSchemaData; // no difference between preprocessed and unprocessed meta schema

      case SessionMode.Settings:
        return useSettingsStore().settingsSchemaData; // no difference between preprocessed and unprocessed settings schema

      default:
        throw new Error('Invalid mode');
    }
  });

  /**
   * The raw schema of the current file, schema, or settings, depending on the current mode.
   */
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

  /**
   * Validation service for the current schema.
   */
  const validationService = ref(new ValidationService(fileSchemaDataPreprocessed.value));

  /**
   * Run the validation service with a debounce.
   */
  const validateDebounced = useDebounceFn(
    data => validationService.value.validate(data),
    GuiConstants.SCHEMA_VALIDATION_DEBOUNCE_TIME
  );

  /**
   * Run the validation service with the given data.
   * @param newData The data to validate.
   */
  function runValidation(newData: any) {
    validateDebounced(newData)
      .then(validationResults => {
        if (validationResults !== undefined) {
          dataValidationResults.value = validationResults;
        }
      })
      .catch(e => errorService.onError(e));
  }

  /**
   * Reload the validation service with the current schema.
   */
  function refreshValidationService() {
    try {
      validationService.value = new ValidationService(fileSchemaDataPreprocessed.value);
      schemaErrorMessage.value = null;
      runValidation(fileData.value);
    } catch (e: any) {
      errorService.onError(e);
      schemaErrorMessage.value = e.message;
    }
  }

  /**
   * Update the validation service when the page changes.
   */
  watch(
    currentMode,
    () => {
      currentExpandedElements.value = {};
      currentSelectedElement.value = [];
      refreshValidationService();
    },
    {immediate: true}
  );

  /**
   * Update the validation service when the schema changes.
   */
  watch(fileSchemaData, () => {
    refreshValidationService();
  });

  /**
   * Returns the schema at the given path.
   */
  function schemaAtPath(path: Path): JsonSchema {
    return fileSchema.value.subSchemaAt(path) ?? new JsonSchema({});
  }

  /**
   * Return the schema at the current path.
   */
  const schemaAtCurrentPath: Ref<JsonSchema> = computed(() => schemaAtPath(currentPath.value));

  /**
   * Returns the effective schema at the given path, i.e., the schema that resolved data dependent keywords.
   */
  function effectiveSchemaAtPath(path: Path): EffectiveSchema {
    let currentEffectiveSchema: EffectiveSchema = calculateEffectiveSchema(
      fileSchema.value,
      fileData.value,
      []
    );

    const currentPath = [];
    for (const key of path) {
      currentPath.push(key);
      const schema = currentEffectiveSchema.schema.subSchema(key);

      if (schema?.oneOf) {
        // TODO not working yet
        const oneOfSelection = currentSelectedOneOfOptions.value.get(pathToString(currentPath));
        if (oneOfSelection !== undefined) {
          currentEffectiveSchema = calculateEffectiveSchema(
            schema.oneOf[oneOfSelection.index],
            dataAtPath(currentPath),
            currentPath
          );
        }
      }

      currentEffectiveSchema = calculateEffectiveSchema(
        schema,
        dataAtPath(currentPath),
        currentPath
      );
    }
    return currentEffectiveSchema;
  }

  const effectiveSchemaAtCurrentPath: Ref<EffectiveSchema> = computed(() =>
    effectiveSchemaAtPath(currentPath.value)
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
    runValidation(fileData.value);
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
    runValidation(fileData.value);
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

  function reloadSchema() {
    useDataStore().reloadSchema();
  }

  return {
    currentMode,
    editorContentUnparsed,
    fileData,
    fileSchema,
    fileSchemaData,
    fileSchemaDataPreprocessed,
    schemaAtPath,
    schemaAtCurrentPath,
    effectiveSchemaAtPath,
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
    currentSelectedOneOfOptions,
    currentSelectedAnyOfOptions,
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
    reloadSchema,
  };
});
