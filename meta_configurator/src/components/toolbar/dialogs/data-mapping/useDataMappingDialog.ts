import {computed, nextTick, ref, watch} from 'vue';
import {useDebounceFn} from '@vueuse/core';
import {getDataForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {useAceEditor} from '@/components/panels/shared-components/useAceEditor';
import {DataMappingServiceJavascript} from '@/data-mapping/javascript/dataMappingServiceJavascript';
import {DataMappingServiceJsonata} from '@/data-mapping/jsonata/dataMappingServiceJsonata';
import type {
  DataMappingService,
  GeneratedCodeRetryContext,
} from '@/data-mapping/dataMappingService';
import {
  generateMappingFunctionSuggestion,
  performDirectAiTargetSchemaMapping,
  type MappingFunctionSuggestionRequest,
  type MappingGenerationLanguage,
  type MappingGenerationMethod,
} from '@/data-mapping/dataMappingAi';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {isSchemaEmpty} from '@/schema/schemaReadingUtils';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import {canQueryAi} from '@/utility/ai/aiAvailability';
import {useErrorService} from '@/utility/errorServiceInstance';
import {hasJsonContent} from '@/utility/hasJsonContent';
import {toastService} from '@/utility/toastService';

/** A mapping function in one of the supported languages, or a direct one-shot AI mapping. */
export type MappingMethod = MappingGenerationMethod | 'direct-ai';

export const MAPPING_METHOD_OPTIONS: {label: string; value: MappingMethod}[] = [
  {
    label: 'Generate Mapping Function based on source data and target schema',
    value: 'source-data',
  },
  {
    label: 'Generate Mapping Function based on inferred source schema and target schema',
    value: 'inferred-source-schema',
  },
  {
    label: 'Direct AI Mapping',
    value: 'direct-ai',
  },
];

export const MAPPING_LANGUAGE_OPTIONS: {label: string; value: MappingGenerationLanguage}[] = [
  {label: 'JSONata', value: 'jsonata'},
  {label: 'JavaScript', value: 'javascript'},
];

const mappingServices: Record<MappingGenerationLanguage, DataMappingService> = {
  javascript: new DataMappingServiceJavascript(),
  jsonata: new DataMappingServiceJsonata(),
};

const editorModeByMappingLanguage: Record<MappingGenerationLanguage, string> = {
  javascript: 'ace/mode/javascript',
  jsonata: 'ace/mode/jsoniq',
};

/** Debounce before the editor content is validated again while the user types. */
const VALIDATION_DEBOUNCE_MILLISECONDS = 100;

export function useDataMappingDialog() {
  const showDialog = ref(false);
  const sourceData = ref<unknown>({});
  const generatedMappingConfiguration = ref('');
  const mappingConfigurationIsValid = ref(false);
  const statusMessage = ref('');
  const errorMessage = ref('');
  const userComments = ref('');
  const isLoadingMapping = ref(false);
  const suggestionRetryContext = ref<GeneratedCodeRetryContext>();
  const selectedMappingMethod = ref<MappingMethod>('source-data');
  const selectedMappingLanguage = ref<MappingGenerationLanguage>('jsonata');
  const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);
  let latestValidationRequestId = 0;

  const apiKey = getApiKeyRef();
  const dataEditorLink = getDataForMode(SessionMode.DataEditor);
  const schemaEditorLink = getDataForMode(SessionMode.SchemaEditor);

  const canUseAi = computed(() => canQueryAi(apiKey.value));
  const usesMappingFunction = computed(() => selectedMappingMethod.value !== 'direct-ai');
  const usesInferredSourceSchema = computed(
    () => selectedMappingMethod.value === 'inferred-source-schema'
  );
  const mappingService = computed(() => mappingServices[selectedMappingLanguage.value]);
  const preparedInput = computed(() =>
    mappingService.value.sanitizeInputDocument(sourceData.value)
  );
  const hasCurrentData = computed(() => hasJsonContent(sourceData.value));
  const targetSchema = computed(() => schemaEditorLink.data.value as TopLevelSchema);
  const hasTargetSchema = computed(() => !isSchemaEmpty(targetSchema.value));
  const hasSelectedRefinements = computed(
    () => refinementOptions.value?.hasSelectedRefinements() ?? false
  );
  const mappingMethodNotice = computed(() => {
    if (selectedMappingMethod.value === 'direct-ai') {
      return 'Direct AI Mapping sends the current data together with the current target schema to the LLM and applies the transformed result directly. No reusable mapping function is generated.';
    }
    if (selectedMappingMethod.value === 'inferred-source-schema') {
      return 'This method infers a source schema locally from the current data, optionally applies the selected refinement steps, and sends only the generated source schema plus the current target schema to the LLM.';
    }
    return 'This method sends the current data together with the current target schema to the LLM and generates a reusable mapping function.';
  });
  const mappingLanguageWarning = computed(() => {
    if (!usesMappingFunction.value) {
      return '';
    }
    return selectedMappingLanguage.value === 'jsonata'
      ? 'The JSONata mapping service is expressive and flexible, but may generate invalid mappings for complex inputs that have to be corrected manually.'
      : 'JavaScript runs in a Web Worker, off the main thread and without DOM access, and common network, import and storage calls are rejected. This keeps accidents in check rather than sandboxing untrusted code, so only run code you would run yourself.';
  });
  const suggestionButtonLabel = computed(() =>
    suggestionRetryContext.value && shouldUseRetryContext()
      ? 'Regenerate Suggestion for Previous Error'
      : 'Generate Suggestion'
  );
  /** The AI actions need a configured endpoint, data to map and a schema to map it to. */
  const isMappingActionDisabled = computed(
    () =>
      !canUseAi.value || !hasCurrentData.value || !hasTargetSchema.value || isLoadingMapping.value
  );
  const apiKeyMessage = computed(() =>
    usesMappingFunction.value
      ? 'AI-generated mapping suggestions are disabled until an AI endpoint or relay is configured. You can still write or edit a mapping manually and run it.'
      : 'Direct AI mapping is disabled until an AI endpoint or relay is configured.'
  );

  const {editorElementId, createEditor, destroyEditor, setEditorMode} = useAceEditor(
    'data-mapping',
    generatedMappingConfiguration,
    {
      mode: editorModeByMappingLanguage[selectedMappingLanguage.value],
      onContentChanged: useDebounceFn(
        (mappingConfiguration: string) => validateConfig(mappingConfiguration, preparedInput.value),
        VALIDATION_DEBOUNCE_MILLISECONDS
      ),
    }
  );

  watch(showDialog, async isDialogVisible => {
    if (!isDialogVisible) {
      destroyEditor();
      return;
    }

    await nextTick();
    createEditor();
    refinementOptions.value?.reset();
  });

  watch(selectedMappingLanguage, () => {
    clearSuggestionRetryContext();
    setEditorMode(editorModeByMappingLanguage[selectedMappingLanguage.value]);
    revalidateCurrentEditorContent();
  });

  watch(selectedMappingMethod, () => {
    clearSuggestionRetryContext();
    statusMessage.value = '';
    errorMessage.value = '';
    if (usesInferredSourceSchema.value) {
      refinementOptions.value?.reset();
    }
    revalidateCurrentEditorContent();
  });

  function openDialog() {
    resetDialog();
    showDialog.value = true;
  }

  function hideDialog() {
    showDialog.value = false;
  }

  function resetDialog() {
    statusMessage.value = '';
    errorMessage.value = '';
    userComments.value = '';
    sourceData.value = dataEditorLink.data.value;
    generatedMappingConfiguration.value = '';
    mappingConfigurationIsValid.value = false;
    selectedMappingMethod.value = 'source-data';
    selectedMappingLanguage.value = 'jsonata';
    clearSuggestionRetryContext();
    refinementOptions.value?.reset();
  }

  function showError(message: string) {
    statusMessage.value = '';
    errorMessage.value = message;
  }

  function clearSuggestionRetryContext() {
    suggestionRetryContext.value = undefined;
  }

  /** Only the JavaScript mapping prompt is improved by feeding the failure back to the LLM. */
  function shouldUseRetryContext(): boolean {
    return usesMappingFunction.value && selectedMappingLanguage.value === 'javascript';
  }

  function saveSuggestionRetryContext(validationError: string, failedCode: string) {
    if (shouldUseRetryContext()) {
      suggestionRetryContext.value = {validationError, previousCode: failedCode};
    }
  }

  async function validateConfig(mappingConfiguration: string, currentInput: unknown) {
    const currentValidationRequestId = ++latestValidationRequestId;
    if (!usesMappingFunction.value) {
      mappingConfigurationIsValid.value = false;
      return;
    }

    const trimmedMappingConfiguration = mappingConfiguration.trim();
    if (trimmedMappingConfiguration.length === 0) {
      mappingConfigurationIsValid.value = false;
      errorMessage.value = '';
      return;
    }

    const validationResult = await mappingService.value.validateMappingConfig(
      trimmedMappingConfiguration,
      currentInput
    );
    if (currentValidationRequestId !== latestValidationRequestId) {
      return;
    }

    if (validationResult.success) {
      errorMessage.value = '';
      mappingConfigurationIsValid.value = true;
      return;
    }

    showError(validationResult.message);
    mappingConfigurationIsValid.value = false;
    saveSuggestionRetryContext(validationResult.message, trimmedMappingConfiguration);
  }

  function revalidateCurrentEditorContent() {
    if (usesMappingFunction.value) {
      void validateConfig(generatedMappingConfiguration.value, preparedInput.value);
    }
  }

  function buildInferredSourceSchema(): TopLevelSchema {
    const sourceSchema = inferJsonSchema(preparedInput.value) as TopLevelSchema;
    const refinementSelection = refinementOptions.value?.buildSelection() ?? null;
    if (!hasSelectedRefinements.value || !refinementSelection) {
      return sourceSchema;
    }

    return runSchemaRefinement(sourceSchema, preparedInput.value, refinementSelection);
  }

  function buildMappingSuggestionRequest(
    retryContext?: GeneratedCodeRetryContext
  ): MappingFunctionSuggestionRequest {
    const sharedRequestFields = {
      language: selectedMappingLanguage.value,
      targetSchema: targetSchema.value,
      userComments: userComments.value,
      retryContext,
    };

    if (selectedMappingMethod.value === 'source-data') {
      return {...sharedRequestFields, method: 'source-data', inputData: preparedInput.value};
    }
    if (selectedMappingMethod.value === 'inferred-source-schema') {
      return {
        ...sharedRequestFields,
        method: 'inferred-source-schema',
        sourceSchema: buildInferredSourceSchema(),
      };
    }

    throw new Error('Direct AI mapping does not generate a reusable mapping function.');
  }

  function canStartAiMapping(aiUnavailableMessage: string): boolean {
    let prerequisiteErrorMessage = '';
    if (!canUseAi.value) {
      prerequisiteErrorMessage = aiUnavailableMessage;
    } else if (!hasCurrentData.value) {
      prerequisiteErrorMessage = 'Please load data into the Data Editor first.';
    } else if (!hasTargetSchema.value) {
      prerequisiteErrorMessage = 'Please load the target schema into the Schema Editor first.';
    }

    if (prerequisiteErrorMessage.length === 0) {
      return true;
    }

    showError(prerequisiteErrorMessage);
    return false;
  }

  function applySuccessfulMapping(resultData: unknown, message: string) {
    // Do not gate this on target-schema validation: a partially correct mapping is useful for
    // manual correction, whereas rejecting it would discard the generated result completely.
    statusMessage.value = message;
    errorMessage.value = '';
    clearSuggestionRetryContext();
    dataEditorLink.setData(resultData);
    toastService.add({
      severity: 'success',
      summary: 'Data mapped',
      detail: message,
      life: 3000,
    });
    hideDialog();
  }

  async function generateMappingSuggestion() {
    if (!usesMappingFunction.value) {
      return;
    }
    if (
      !canStartAiMapping(
        'AI-generated mapping suggestions are disabled until AI access is configured.'
      )
    ) {
      return;
    }

    isLoadingMapping.value = true;
    statusMessage.value = '';
    errorMessage.value = '';
    const retryContext = shouldUseRetryContext() ? suggestionRetryContext.value : undefined;

    try {
      const suggestionResult = await generateMappingFunctionSuggestion(
        buildMappingSuggestionRequest(retryContext)
      );

      if (!suggestionResult.success) {
        showError(suggestionResult.message);
        return;
      }

      generatedMappingConfiguration.value = suggestionResult.config;
      statusMessage.value = suggestionResult.message;
      errorMessage.value = '';
      clearSuggestionRetryContext();
      await validateConfig(suggestionResult.config, preparedInput.value);
    } catch (error) {
      useErrorService().onError(error);
    } finally {
      isLoadingMapping.value = false;
    }
  }

  async function performMapping() {
    const mappingConfiguration = generatedMappingConfiguration.value.trim();
    if (!mappingConfiguration) {
      showError('No mapping configuration available.');
      return;
    }

    const mappingResult = await mappingService.value.performDataMapping(
      preparedInput.value,
      mappingConfiguration
    );
    if (mappingResult.success) {
      applySuccessfulMapping(mappingResult.resultData, mappingResult.message);
      return;
    }

    showError(mappingResult.message);
    saveSuggestionRetryContext(mappingResult.message, mappingConfiguration);
  }

  async function executeDirectAiMapping() {
    if (!canStartAiMapping('Direct AI mapping is disabled until AI access is configured.')) {
      return;
    }

    isLoadingMapping.value = true;
    statusMessage.value = '';
    errorMessage.value = '';

    try {
      const directMappingResult = await performDirectAiTargetSchemaMapping(
        sourceData.value,
        targetSchema.value,
        userComments.value
      );

      if (!directMappingResult.success) {
        showError(directMappingResult.message);
        return;
      }

      applySuccessfulMapping(directMappingResult.resultData, directMappingResult.message);
    } catch (error) {
      useErrorService().onError(error);
    } finally {
      isLoadingMapping.value = false;
    }
  }

  return {
    showDialog,
    refinementOptions,
    generatedMappingConfiguration,
    mappingConfigurationIsValid,
    statusMessage,
    errorMessage,
    userComments,
    isLoadingMapping,
    selectedMappingMethod,
    selectedMappingLanguage,
    editorElementId,
    canUseAi,
    usesMappingFunction,
    usesInferredSourceSchema,
    hasCurrentData,
    hasTargetSchema,
    mappingMethodNotice,
    mappingLanguageWarning,
    suggestionButtonLabel,
    isMappingActionDisabled,
    apiKeyMessage,
    openDialog,
    hideDialog,
    generateMappingSuggestion,
    performMapping,
    executeDirectAiMapping,
  };
}
