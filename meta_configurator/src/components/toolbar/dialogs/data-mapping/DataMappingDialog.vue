<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {DataMappingServiceJavascript} from '@/data-mapping/javascript/dataMappingServiceJavascript';
import {DataMappingServiceJsonata} from '@/data-mapping/jsonata/dataMappingServiceJsonata';
import type {
  DataMappingService,
  GeneratedCodeRetryContext,
} from '@/data-mapping/dataMappingService';
import 'brace/mode/javascript';
import 'brace/mode/jsoniq';
import {useAceEditor} from '@/components/panels/shared-components/useAceEditor';
import {useDebounceFn} from '@vueuse/core';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import {canQueryAi} from '@/utility/ai/aiAvailability';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {toastService} from '@/utility/toastService';
import {
  generateMappingFunctionSuggestion,
  performDirectAiTargetSchemaMapping,
  type MappingFunctionSuggestionRequest,
  type MappingGenerationLanguage,
  type MappingGenerationMethod,
} from '@/data-mapping/dataMappingAi';
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';
import {hasJsonContent} from '@/utility/jsonCompatible';
import {isSchemaEmpty} from '@/schema/schemaReadingUtils';

type MappingMethod = MappingGenerationMethod | 'direct-ai';

const mappingMethodOptions: {label: string; value: MappingMethod}[] = [
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

const mappingLanguageOptions: {label: string; value: MappingGenerationLanguage}[] = [
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
const preparedInput = computed(() => mappingService.value.sanitizeInputDocument(sourceData.value));
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
    : 'JavaScript mappings run in an isolated worker. Network access, imports, browser storage, DOM access, dynamic code, and long-running execution are blocked.';
});
const suggestionButtonLabel = computed(() =>
  suggestionRetryContext.value && shouldUseRetryContext()
    ? 'Regenerate Suggestion for Previous Error'
    : 'Generate Suggestion'
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
      100
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

function shouldUseRetryContext(): boolean {
  return usesMappingFunction.value && selectedMappingLanguage.value === 'javascript';
}

function saveSuggestionRetryContext(validationError: string, failedCode: string) {
  if (!shouldUseRetryContext()) {
    return;
  }

  suggestionRetryContext.value = {validationError, previousCode: failedCode};
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
  if (!validationResult.success) {
    showError(validationResult.message);
    mappingConfigurationIsValid.value = false;
    saveSuggestionRetryContext(validationResult.message, trimmedMappingConfiguration);
  } else {
    errorMessage.value = '';
    mappingConfigurationIsValid.value = true;
  }
}

function revalidateCurrentEditorContent() {
  if (!usesMappingFunction.value) {
    return;
  }

  void validateConfig(generatedMappingConfiguration.value, preparedInput.value);
}

function buildInferredSourceSchema(): TopLevelSchema {
  let sourceSchema = inferJsonSchema(preparedInput.value) as TopLevelSchema;
  const refinementSelection: RefineSchemaSelection | null =
    refinementOptions.value?.buildSelection() ?? null;

  if (usesInferredSourceSchema.value && hasSelectedRefinements.value && refinementSelection) {
    sourceSchema = runSchemaRefinement(sourceSchema, preparedInput.value, refinementSelection);
  }

  return sourceSchema;
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
  } else {
    showError(mappingResult.message);
    saveSuggestionRetryContext(mappingResult.message, mappingConfiguration);
  }
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

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Convert Data to Target Schema"
    :modal="true"
    :style="{width: '56rem', maxWidth: '95vw'}">
    <div class="dialog-content">
      <PanelSettings
        panel-name="API Key and AI Settings"
        panel-display-name="API Key and AI Settings"
        settings-header="AI Settings"
        :panel-settings-path="['aiIntegration']"
        :sessionMode="SessionMode.DataEditor">
        <ApiKey />
      </PanelSettings>

      <ApiKeyWarning />

      <Message severity="info" :closable="false">
        {{ mappingMethodNotice }}
      </Message>

      <Message v-if="mappingLanguageWarning.length" severity="warn" :closable="false">
        {{ mappingLanguageWarning }}
      </Message>

      <Message v-if="!canUseAi" severity="info" :closable="false">
        {{ apiKeyMessage }}
      </Message>

      <Message v-if="!hasCurrentData" severity="warn" :closable="false">
        No data is currently loaded in the Data Editor. Load data first before converting it.
      </Message>

      <Message v-if="!hasTargetSchema" severity="warn" :closable="false">
        No target schema is currently loaded in the Schema Editor.
      </Message>

      <p class="text-sm text-gray-700">
        This tool converts the data from the <strong>Data Editor</strong> to match the schema
        defined in the <strong>Schema Editor</strong>. You can optionally provide extra instructions
        below to guide the mapping.
      </p>

      <div class="field-group">
        <label for="userComments" class="block font-semibold mb-1">Additional Mapping Hints</label>
        <InputText
          id="userComments"
          v-model="userComments"
          class="w-full"
          placeholder="e.g., rename fields, format dates..." />
      </div>

      <div class="field-group">
        <label class="block font-semibold mb-1">Mapping Method</label>
        <Select
          v-model="selectedMappingMethod"
          :options="mappingMethodOptions"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>

      <div v-if="usesMappingFunction" class="field-group">
        <label class="block font-semibold mb-1">Mapping Language</label>
        <Select
          v-model="selectedMappingLanguage"
          :options="mappingLanguageOptions"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>

      <SchemaRefinementOptions
        v-if="usesInferredSourceSchema"
        ref="refinementOptions"
        id-prefix="mapping-inferred-source-schema"
        add-examples-description="Add real example values from the current input data to the locally inferred source schema before it is sent to the LLM." />

      <Button
        v-if="usesMappingFunction"
        :label="suggestionButtonLabel"
        icon="pi pi-wand"
        @click="generateMappingSuggestion"
        class="w-full"
        :loading="isLoadingMapping"
        :disabled="!canUseAi || !hasCurrentData || !hasTargetSchema || isLoadingMapping" />

      <Button
        v-else
        label="Execute AI Mapping"
        icon="pi pi-play"
        @click="executeDirectAiMapping"
        class="w-full"
        :loading="isLoadingMapping"
        :disabled="!canUseAi || !hasCurrentData || !hasTargetSchema || isLoadingMapping" />

      <div v-show="usesMappingFunction" class="mapping-editor-section">
        <Divider />
        <label :for="editorElementId" class="block font-semibold mb-2">Mapping Function</label>
        <div class="editor-wrapper">
          <div :id="editorElementId" class="editor-surface" />
        </div>
        <Button
          v-if="mappingConfigurationIsValid"
          label="Perform Mapping"
          icon="pi pi-play"
          class="mt-4 w-full"
          @click="performMapping" />
      </div>

      <Message severity="info" v-if="statusMessage.length">{{ statusMessage }}</Message>
      <Message severity="error" v-if="errorMessage.length">
        {{ errorMessage }}
      </Message>
    </div>
  </Dialog>
</template>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.mapping-editor-section {
  display: flex;
  flex-direction: column;
}

.editor-wrapper {
  border: 1px solid var(--surface-border);
  border-radius: var(--content-border-radius);
  height: 18rem;
  overflow: hidden;
}

.editor-surface {
  width: 100%;
  height: 100%;
}

label {
  font-size: 0.9rem;
}
</style>
