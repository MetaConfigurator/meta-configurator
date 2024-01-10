import type {ComputedRef, Ref} from 'vue';
import {computed, ref, watch} from 'vue';
import type {Path} from '@/model/path';
import {defineStore} from 'pinia';
import {useDataStore} from '@/store/dataStore';
import {JsonSchema} from '@/schema/jsonSchema';
import {pathToString} from '@/utility/pathUtils';
import {useSettingsStore} from '@/store/settingsStore';
import type {TopLevelJsonSchema} from '@/schema/topLevelJsonSchema';
import type {SearchResult} from '@/utility/search';
import {calculateEffectiveSchema, EffectiveSchema} from '@/schema/effectiveSchemaCalculator';
import type {OneOfAnyOfSelectionOption} from '@/model/oneOfAnyOfSelectionOption';
import type {JsonSchemaType} from '@/model/jsonSchemaType';
import {useCurrentDataLink} from '@/data/useDataLink';

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
      useCurrentDataLink().data.value,
      []
    );

    const currentPath = [];
    for (const key of path) {
      currentPath.push(key);
      const schema = currentEffectiveSchema.schema.subSchema(key);

      if (schema?.oneOf) {
        const oneOfSelection = currentSelectedOneOfOptions.value.get(pathToString(currentPath));
        if (oneOfSelection !== undefined) {
          currentEffectiveSchema = calculateEffectiveSchema(
            schema.oneOf[oneOfSelection.index],
            useCurrentDataLink().dataAt(currentPath),
            currentPath
          );
          continue;
        }
      }

      currentEffectiveSchema = calculateEffectiveSchema(
        schema,
        useCurrentDataLink().dataAt(currentPath),
        currentPath
      );
    }
    return currentEffectiveSchema;
  }

  const effectiveSchemaAtCurrentPath: Ref<EffectiveSchema> = computed(() =>
    effectiveSchemaAtPath(currentPath.value)
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

  function reloadSchema() {
    useDataStore().reloadSchema();
  }

  return {
    currentMode,
    fileSchema,
    fileSchemaDataPreprocessed,
    schemaAtPath,
    schemaAtCurrentPath,
    effectiveSchemaAtPath,
    effectiveSchemaAtCurrentPath,
    schemaErrorMessage,
    dataAtCurrentPath: computed(() => useCurrentDataLink().dataAt(currentPath.value)),
    currentPath,
    currentSelectedElement,
    currentExpandedElements,
    currentSearchResults,
    currentSelectedOneOfOptions,
    currentSelectedTypeUnionOptions,
    currentSelectedAnyOfOptions,
    isHighlighted,
    isExpanded,
    expand,
    collapse,
    updateCurrentPath,
    updateCurrentSelectedElement,
    reloadSchema,
  };
});
