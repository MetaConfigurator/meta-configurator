import {computed, nextTick, ref, shallowRef, watch} from 'vue';
import {useAceEditor} from '@/components/panels/shared-components/useAceEditor';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {isSchemaEmpty} from '@/schema/schemaReadingUtils';
import {SessionMode} from '@/store/sessionMode';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import {canQueryAi} from '@/utility/ai/aiAvailability';
import {getErrorMessage} from '@/utility/getErrorMessage';
import {
  generateImportScriptSuggestion,
  generateParsedDataMappingScriptSuggestion,
  runDirectParsedImport,
  runFullAiImport,
  runImportWithGeneratedScript,
  validateGeneratedImportScript,
  type DataImportAiSchemaSource,
  type DataImportExecutionResult,
  type GeneratedScriptResult,
} from './dataImportAiService';
import {useDataImportAiSourceFile} from './useDataImportAiSourceFile';
import {isJsonLdDocument} from '@/utility/rdf/isJsonLdDocument';

export type DataImportAiMode =
  | 'javascript_mapping'
  | 'direct_parse'
  | 'map_parsed_to_schema'
  | 'full_ai_import';

type PendingImportConfirmation = {
  resultData: unknown;
  schemaSource: DataImportAiSchemaSource;
  mode: DataImportAiMode;
  editorSnapshot: string;
  confirmedMessage: string;
};

type ImportExecutor = (
  schemaSource: DataImportAiSchemaSource,
  currentSchema: TopLevelSchema | undefined
) => Promise<DataImportExecutionResult>;

const DEFAULT_TRANSFORM_SCRIPT = `function transform(input) {
  return input;
}`;
export const INFER_SCHEMA_OPTION = 'Automatic schema handling';
export const USE_CURRENT_SCHEMA_OPTION = 'Validate against current schema';
export const SCHEMA_SOURCE_OPTIONS = [INFER_SCHEMA_OPTION, USE_CURRENT_SCHEMA_OPTION];
/** Sample size used to smoke-test a generated parser before running the real import. */
const VALIDATION_SAMPLE_CHARACTERS = 2048;

export function useDataImportAiDialog() {
  const showDialog = ref(false);
  const userComments = ref('');
  const statusMessage = ref('');
  const errorMessage = ref('');
  const warningMessage = ref('');
  const selectedImportMode = ref<DataImportAiMode>('javascript_mapping');
  const selectedSchemaSource = ref(INFER_SCHEMA_OPTION);
  const isLoadingSuggestion = ref(false);
  const isImportingData = ref(false);
  const hasValidationErrorForSuggestion = ref(false);
  const lastValidationError = ref('');
  const lastFailedScript = ref('');
  // shallowRef: keeps the imported document raw, see useDataImportAiSourceFile.
  const pendingImportConfirmation = shallowRef<PendingImportConfirmation | null>(null);
  const generatedScript = ref(DEFAULT_TRANSFORM_SCRIPT);

  const {
    selectedFileName,
    selectedFileSize,
    selectedFileType,
    uploadedContent,
    backendDisplayText,
    backendPromptHint,
    formatProcessingErrorMessage,
    parsedJsonFromBackend,
    preprocessedJsonForAi,
    isDetectingFormat,
    canUseDirectParse,
    selectSourceFile,
    resetSourceFile,
  } = useDataImportAiSourceFile();

  const apiKey = getApiKeyRef();
  const {editorElementId, createEditor, destroyEditor} = useAceEditor(
    'data-import-ai',
    generatedScript,
    {mode: 'ace/mode/javascript'}
  );

  const canUseAi = computed(() => canQueryAi(apiKey.value));
  const formatProcessingErrorNotice = computed(() =>
    formatProcessingErrorMessage.value
      ? `${formatProcessingErrorMessage.value} Backend-dependent modes are disabled. ` +
        `Manual JavaScript import and full AI import remain available.`
      : ''
  );
  const usesCurrentSchema = computed(
    () => selectedSchemaSource.value === USE_CURRENT_SCHEMA_OPTION
  );
  const importModeOptions = computed(() => {
    const options = [
      {
        label: 'Generate JavaScript mapping from raw input',
        value: 'javascript_mapping' as DataImportAiMode,
        disabled: false,
      },
      {
        label: 'Use parsed result directly',
        value: 'direct_parse' as DataImportAiMode,
        disabled: !canUseDirectParse.value,
      },
    ];
    if (usesCurrentSchema.value && hasCurrentSchema()) {
      options.push({
        label: 'Map parsed data to schema with AI',
        value: 'map_parsed_to_schema',
        disabled: !canUseDirectParse.value || !canUseAi.value,
      });
    }
    options.push({
      label: 'Full AI import',
      value: 'full_ai_import',
      disabled: !canUseAi.value,
    });
    return options;
  });
  const isBusy = computed(
    () => isImportingData.value || isLoadingSuggestion.value || isDetectingFormat.value
  );
  const hasUploadedFile = computed(() => uploadedContent.value.length > 0);
  const usesJavascriptStep = computed(
    () =>
      selectedImportMode.value === 'javascript_mapping' ||
      selectedImportMode.value === 'map_parsed_to_schema'
  );
  const isCurrentImportModeDisabled = computed(() => {
    const selectedOption = importModeOptions.value.find(
      option => option.value === selectedImportMode.value
    );
    return selectedOption === undefined || selectedOption.disabled;
  });
  const isSuggestionDisabled = computed(
    () => !hasUploadedFile.value || !canUseAi.value || isBusy.value
  );
  const isImportDisabled = computed(
    () => !hasUploadedFile.value || isCurrentImportModeDisabled.value || isBusy.value
  );
  const suggestionButtonLabel = computed(() => {
    if (hasValidationErrorForSuggestion.value) {
      return 'Regenerate Suggestion for Previous Error';
    }
    return selectedImportMode.value === 'map_parsed_to_schema'
      ? 'Generate Mapping'
      : 'Generate JavaScript Suggestion';
  });
  const importButtonLabel = computed(() => {
    if (pendingImportConfirmation.value) {
      return 'Import Anyway';
    }
    if (selectedImportMode.value === 'full_ai_import') {
      return 'Import with Full AI (No JS)';
    }
    if (selectedImportMode.value === 'direct_parse' && canUseDirectParse.value) {
      return 'Import Directly (No AI Call)';
    }
    return 'Import Data';
  });

  watch(
    [showDialog, usesJavascriptStep, canUseAi],
    async ([isDialogVisible, usesJavascriptEditor, isAiAvailable]) => {
      if (!isDialogVisible || !usesJavascriptEditor || !isAiAvailable) {
        destroyEditor();
        return;
      }

      await nextTick();
      createEditor();
    }
  );

  watch([canUseDirectParse, canUseAi, selectedSchemaSource], () => {
    if (isCurrentImportModeDisabled.value) {
      selectedImportMode.value = getDefaultImportMode();
    }
  });

  watch(selectedImportMode, () => {
    clearSuggestionRetryContext();
    clearPendingImportConfirmation();
  });
  watch([selectedSchemaSource, userComments], clearPendingImportConfirmation);

  function openDialog() {
    resetDialog();
    showDialog.value = true;
  }

  function hideDialog() {
    showDialog.value = false;
  }

  function resetDialog() {
    resetSourceFile();
    resetFileDependentImportState();
    userComments.value = '';
    statusMessage.value = '';
    errorMessage.value = '';
    selectedSchemaSource.value = hasCurrentSchema()
      ? USE_CURRENT_SCHEMA_OPTION
      : INFER_SCHEMA_OPTION;
    generatedScript.value = DEFAULT_TRANSFORM_SCRIPT;
  }

  function showError(message: string) {
    statusMessage.value = '';
    errorMessage.value = message;
  }

  function clearSuggestionRetryContext() {
    hasValidationErrorForSuggestion.value = false;
    lastValidationError.value = '';
    lastFailedScript.value = '';
  }

  function clearPendingImportConfirmation() {
    pendingImportConfirmation.value = null;
    warningMessage.value = '';
  }

  function getSelectedSchemaSource(): DataImportAiSchemaSource {
    return selectedSchemaSource.value === USE_CURRENT_SCHEMA_OPTION
      ? 'use_current_schema'
      : 'infer_from_data';
  }

  function getCurrentSchema(): TopLevelSchema | undefined {
    return getDataForMode(SessionMode.SchemaEditor).data.value;
  }

  function hasCurrentSchema(): boolean {
    const currentSchema = getCurrentSchema();
    return currentSchema !== undefined && !isSchemaEmpty(currentSchema);
  }

  function getDefaultImportMode(): DataImportAiMode {
    return canUseDirectParse.value ? 'direct_parse' : 'javascript_mapping';
  }

  /** The script the import runs on, which is only relevant for the JavaScript-based modes. */
  function getEditorSnapshot(): string {
    return usesJavascriptStep.value ? generatedScript.value : '';
  }

  function finalizeImport(
    resultData: unknown,
    schemaSource: DataImportAiSchemaSource,
    message: string
  ) {
    const inferredSchema =
      schemaSource === 'infer_from_data' ? inferSchemaUnlessJsonLd(resultData) : undefined;

    getDataForMode(SessionMode.DataEditor).setData(resultData);
    if (inferredSchema !== undefined) {
      getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = inferredSchema;
    }

    statusMessage.value = message;
    errorMessage.value = '';
    clearPendingImportConfirmation();
    hideDialog();
  }

  function inferSchemaUnlessJsonLd(resultData: unknown): TopLevelSchema {
    // JSON-LD serializations can have very different structures for equivalent RDF data.
    // Leave them schema-free unless the user deliberately imports against the current schema.
    return isJsonLdDocument(resultData) ? {} : inferJsonSchema(resultData);
  }

  /**
   * A schema mismatch only warns the first time; importing again with unchanged settings
   * confirms it. Returns true once such a pending import has been confirmed and applied.
   */
  function maybeConfirmPendingImport(
    mode: DataImportAiMode,
    schemaSource: DataImportAiSchemaSource,
    editorSnapshot: string
  ): boolean {
    const pendingImport = pendingImportConfirmation.value;
    if (!pendingImport) {
      return false;
    }

    const matchesCurrentContext =
      pendingImport.mode === mode &&
      pendingImport.schemaSource === schemaSource &&
      pendingImport.editorSnapshot === editorSnapshot;
    if (!matchesCurrentContext) {
      clearPendingImportConfirmation();
      return false;
    }

    finalizeImport(
      pendingImport.resultData,
      pendingImport.schemaSource,
      pendingImport.confirmedMessage
    );
    return true;
  }

  function handleImportResult(
    result: DataImportExecutionResult,
    schemaSource: DataImportAiSchemaSource,
    mode: DataImportAiMode,
    editorSnapshot: string
  ) {
    if (!result.success) {
      showError(result.message);
      clearPendingImportConfirmation();
      return;
    }

    if (result.requiresConfirmation) {
      pendingImportConfirmation.value = {
        resultData: result.resultData,
        schemaSource,
        mode,
        editorSnapshot,
        confirmedMessage:
          result.confirmedMessage ?? 'Data imported despite schema mismatch warning.',
      };
      statusMessage.value = result.message;
      errorMessage.value = '';
      warningMessage.value = result.warningMessage ?? result.message;
      return;
    }

    finalizeImport(result.resultData, schemaSource, result.message);
  }

  async function onFileSelected(event: Event) {
    resetFileDependentImportState();
    errorMessage.value = '';
    try {
      if (await selectSourceFile(event)) {
        selectedImportMode.value = getDefaultImportMode();
        if (isJsonLdDocument(parsedJsonFromBackend.value)) {
          selectedSchemaSource.value = INFER_SCHEMA_OPTION;
        }
      }
    } catch {
      showError('Failed to read selected file.');
    }
  }

  function resetFileDependentImportState() {
    selectedImportMode.value = getDefaultImportMode();
    clearSuggestionRetryContext();
    clearPendingImportConfirmation();
  }

  async function generateSuggestion() {
    if (uploadedContent.value.length === 0) {
      showError('Please select a file first.');
      return;
    }
    if (!canUseAi.value) {
      showError('AI suggestion generation is disabled until AI access is configured.');
      return;
    }

    const mapsParsedDataToSchema = selectedImportMode.value === 'map_parsed_to_schema';
    if (mapsParsedDataToSchema && (!canUseDirectParse.value || !usesCurrentSchema.value)) {
      showError('Schema mapping requires parsed backend data and the current schema.');
      return;
    }

    clearPendingImportConfirmation();
    const schemaSource = getSelectedSchemaSource();
    isLoadingSuggestion.value = true;
    statusMessage.value = getSuggestionProgressMessage(mapsParsedDataToSchema);
    errorMessage.value = '';

    try {
      const result = await requestScriptSuggestion(mapsParsedDataToSchema, schemaSource);

      if (!result.success) {
        showError(result.message);
        return;
      }

      generatedScript.value = result.config;
      clearSuggestionRetryContext();
      statusMessage.value = result.message;
      errorMessage.value = '';
    } catch (error) {
      showError(`Failed to generate JavaScript suggestion. Reason: ${getErrorMessage(error)}.`);
    } finally {
      isLoadingSuggestion.value = false;
    }
  }

  function requestScriptSuggestion(
    mapsParsedDataToSchema: boolean,
    schemaSource: DataImportAiSchemaSource
  ): Promise<GeneratedScriptResult> {
    const sharedRequest = {
      userComments: userComments.value,
      schemaSource,
      currentSchema: getCurrentSchema(),
      backendDisplayText: backendDisplayText.value,
      backendPromptHint: backendPromptHint.value,
      retryContext: getSuggestionRetryContext(),
    };
    if (mapsParsedDataToSchema) {
      return generateParsedDataMappingScriptSuggestion({
        ...sharedRequest,
        parsedData: parsedJsonFromBackend.value,
        preprocessedDataForAi: preprocessedJsonForAi.value ?? parsedJsonFromBackend.value,
      });
    }
    return generateImportScriptSuggestion({
      ...sharedRequest,
      inputFileName: selectedFileName.value || 'uploaded-file',
      inputFileType: selectedFileType.value,
      inputDocument: uploadedContent.value,
    });
  }

  function getSuggestionRetryContext() {
    return hasValidationErrorForSuggestion.value
      ? {
          validationError: lastValidationError.value,
          previousCode: lastFailedScript.value,
        }
      : undefined;
  }

  function getSuggestionProgressMessage(mapsParsedDataToSchema: boolean): string {
    if (hasValidationErrorForSuggestion.value) {
      return mapsParsedDataToSchema
        ? 'Generating an improved schema mapping from the validation error...'
        : 'Generating improved JavaScript parser suggestion based on the validation error...';
    }
    if (mapsParsedDataToSchema) {
      return 'Generating schema mapping from parsed data...';
    }
    return 'Generating JavaScript parser suggestion...';
  }

  /**
   * Shared tail of every import mode: confirm a pending schema mismatch, show progress,
   * run the mode-specific import and report its outcome.
   */
  async function runImport(
    mode: DataImportAiMode,
    editorSnapshot: string,
    progressMessage: string,
    executeImport: ImportExecutor
  ) {
    const schemaSource = getSelectedSchemaSource();
    if (maybeConfirmPendingImport(mode, schemaSource, editorSnapshot)) {
      return;
    }

    isImportingData.value = true;
    statusMessage.value = progressMessage;
    errorMessage.value = '';

    try {
      const result = await executeImport(schemaSource, getCurrentSchema());
      handleImportResult(result, schemaSource, mode, editorSnapshot);
    } catch (error) {
      showError(`Import failed. Reason: ${getErrorMessage(error)}.`);
    } finally {
      isImportingData.value = false;
    }
  }

  async function importWithGeneratedScript() {
    if (uploadedContent.value.length === 0) {
      showError('Please select a file first.');
      return;
    }

    const currentScript = generatedScript.value;
    if (currentScript.trim().length === 0) {
      showError('No JavaScript parser available.');
      return;
    }

    const usesParsedInput = selectedImportMode.value === 'map_parsed_to_schema';
    if (usesParsedInput && parsedJsonFromBackend.value === null) {
      showError('No parsed backend JSON is available for schema mapping.');
      return;
    }

    const inputForTransform = usesParsedInput ? parsedJsonFromBackend.value : uploadedContent.value;
    const validationSample = usesParsedInput
      ? parsedJsonFromBackend.value
      : uploadedContent.value.slice(0, VALIDATION_SAMPLE_CHARACTERS);

    const validation = await validateGeneratedImportScript(currentScript, validationSample);
    if (!validation.success) {
      hasValidationErrorForSuggestion.value = true;
      lastValidationError.value = validation.message;
      lastFailedScript.value = currentScript;
      showError(validation.message);
      return;
    }

    await runImport(
      selectedImportMode.value,
      currentScript,
      'Importing data...',
      (schemaSource, currentSchema) =>
        runImportWithGeneratedScript(inputForTransform, currentScript, schemaSource, currentSchema)
    );
  }

  async function importDirectlyParsedJson() {
    if (!canUseDirectParse.value || parsedJsonFromBackend.value === null) {
      showError('No parsed JSON is available for direct import.');
      return;
    }

    await runImport(
      'direct_parse',
      getEditorSnapshot(),
      'Importing directly parsed data...',
      (schemaSource, currentSchema) =>
        runDirectParsedImport(parsedJsonFromBackend.value, schemaSource, currentSchema)
    );
  }

  async function importWithFullAi() {
    if (uploadedContent.value.length === 0) {
      showError('Please select a file first.');
      return;
    }
    if (!canUseAi.value) {
      showError('Full AI import is disabled until AI access is configured.');
      return;
    }

    await runImport(
      'full_ai_import',
      getEditorSnapshot(),
      'Importing with full AI conversion...',
      (schemaSource, currentSchema) =>
        runFullAiImport({
          inputDocument: uploadedContent.value,
          schemaSource,
          currentSchema,
          backendDisplayText: backendDisplayText.value,
          backendPromptHint: backendPromptHint.value,
          userComments: userComments.value,
        })
    );
  }

  function importData() {
    if (selectedImportMode.value === 'full_ai_import') {
      return importWithFullAi();
    }
    if (selectedImportMode.value === 'direct_parse' && canUseDirectParse.value) {
      return importDirectlyParsedJson();
    }
    return importWithGeneratedScript();
  }

  return {
    showDialog,
    selectedFileName,
    selectedFileSize,
    userComments,
    statusMessage,
    errorMessage,
    warningMessage,
    backendDisplayText,
    formatProcessingErrorMessage,
    selectedImportMode,
    selectedSchemaSource,
    isLoadingSuggestion,
    isImportingData,
    isDetectingFormat,
    isBusy,
    isSuggestionDisabled,
    isImportDisabled,
    generatedScript,
    editorElementId,
    canUseAi,
    formatProcessingErrorNotice,
    importModeOptions,
    usesJavascriptStep,
    suggestionButtonLabel,
    importButtonLabel,
    openDialog,
    hideDialog,
    onFileSelected,
    generateSuggestion,
    importData,
  };
}
