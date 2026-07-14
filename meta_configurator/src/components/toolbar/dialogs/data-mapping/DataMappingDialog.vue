<script setup lang="ts">
import {computed, nextTick, ref, watch, type Ref} from 'vue';
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
  DataMappingSuggestionRetryContext,
} from '@/data-mapping/dataMappingService';
import type {Editor} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/jsoniq';
import 'brace/mode/text';
import {setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {useSettings} from '@/settings/useSettings';
import {useDebounceFn} from '@vueuse/core';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {ValidationService} from '@/schema/validationService';
import {toastService} from '@/utility/toastService';
import {
  generateMappingFunctionSuggestion,
  performDirectAiTargetSchemaMapping,
  type MappingGenerationLanguage,
  type MappingGenerationMethod,
} from '@/data-mapping/dataMappingAi';
import type {SchemaRefinementOptionsController} from '@/schema/refinement/schemaRefinementOptionsController';
import type {RefineSchemaSelection} from '@/schema/refinement/refineSchemaTypes';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {runSchemaRefinement} from '@/schema/refinement/runSchemaRefinement';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';

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

const showDialog = ref(false);
const editorId = 'data-mapping-' + Math.random();
const editor: Ref<Editor | null> = ref(null);
const rawInput = ref<unknown>({});
const result = ref('');
const resultIsValid = ref(false);
const statusMessage = ref('');
const errorMessage = ref('');
const userComments = ref('');
const isLoadingMapping = ref(false);
const hasValidationErrorForSuggestion = ref(false);
const lastValidationError = ref('');
const lastFailedConfig = ref('');
const selectedMappingMethod = ref<MappingMethod>('source-data');
const selectedMappingLanguage = ref<MappingGenerationLanguage>('jsonata');
const refinementOptions = ref<SchemaRefinementOptionsController | null>(null);

const apiKey = getApiKeyRef();
const settings = useSettings();
const dataEditorLink = getDataForMode(SessionMode.DataEditor);
const schemaEditorLink = getDataForMode(SessionMode.SchemaEditor);
const hasApiKey = computed(() => apiKey.value.trim().length > 0);
const usesMappingFunction = computed(() => selectedMappingMethod.value !== 'direct-ai');
const usesInferredSourceSchema = computed(
  () => selectedMappingMethod.value === 'inferred-source-schema'
);
const mappingService = computed<DataMappingService>(() =>
  selectedMappingLanguage.value === 'javascript'
    ? new DataMappingServiceJavascript()
    : new DataMappingServiceJsonata()
);
const preparedInput = computed(() => mappingService.value.sanitizeInputDocument(rawInput.value));
const hasCurrentData = computed(() => hasLoadedData(rawInput.value));
const targetSchema = computed(() => schemaEditorLink.data.value as TopLevelSchema);
const hasTargetSchema = computed(() => hasLoadedData(targetSchema.value));
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
    : 'JavaScript mappings execute code. Only use this mode with trusted inputs or sandboxed execution.';
});
const suggestionButtonLabel = computed(() =>
  hasValidationErrorForSuggestion.value && shouldUseRetryContext()
    ? 'Regenerate Suggestion for Previous Error'
    : 'Generate Suggestion'
);
const apiKeyMessage = computed(() =>
  usesMappingFunction.value
    ? 'AI-generated mapping suggestions are disabled until an LLM API key is configured. You can still write or edit a mapping manually and run it.'
    : 'Direct AI mapping is disabled until an LLM API key is configured.'
);

watch(result, newValue => {
  if (newValue.length > 0 && editor.value) {
    editor.value.setValue(newValue, -1);
  }
});

watch(showDialog, async visible => {
  if (visible) {
    await nextTick();
    initializeEditor();
    refinementOptions.value?.reset();
    if (result.value.length > 0) {
      editor.value?.setValue(result.value, -1);
    }
  }
});

watch(selectedMappingLanguage, () => {
  clearSuggestionRetryContext();
  updateEditorMode();
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
  rawInput.value = dataEditorLink.data.value;
  result.value = '';
  resultIsValid.value = false;
  selectedMappingMethod.value = 'source-data';
  selectedMappingLanguage.value = 'jsonata';
  clearSuggestionRetryContext();
  refinementOptions.value?.reset();
  editor.value?.setValue('', -1);
}

function clearSuggestionRetryContext() {
  hasValidationErrorForSuggestion.value = false;
  lastValidationError.value = '';
  lastFailedConfig.value = '';
}

function hasLoadedData(data: unknown): boolean {
  if (data === null || data === undefined) {
    return false;
  }
  if (Array.isArray(data)) {
    return data.length > 0;
  }
  if (typeof data === 'object') {
    return Object.keys(data).length > 0;
  }
  return true;
}

function shouldUseRetryContext(): boolean {
  return usesMappingFunction.value && selectedMappingLanguage.value === 'javascript';
}

function saveSuggestionRetryContext(validationError: string, failedConfig: string) {
  if (!shouldUseRetryContext()) {
    return;
  }

  hasValidationErrorForSuggestion.value = true;
  lastValidationError.value = validationError;
  lastFailedConfig.value = failedConfig;
}

function initializeEditor() {
  const container = document.getElementById(editorId);
  if (!container) {
    console.log('Unable to initialize editor because element is not found.');
    return;
  }

  if (editor.value) {
    editor.value.destroy();
    editor.value.container.innerHTML = '';
    editor.value = null;
  }

  editor.value = ace.edit(editorId);
  setupAceProperties(editor.value, settings.value);
  updateEditorMode();
  editor.value.getSession().setUseWorker(false);

  editor.value.on(
    'change',
    useDebounceFn(() => {
      const editorContent = editor.value?.getValue() ?? '';
      validateConfig(editorContent, preparedInput.value);
    }, 100)
  );
}

function updateEditorMode() {
  if (!editor.value) {
    return;
  }

  if (selectedMappingLanguage.value === 'javascript') {
    editor.value.getSession().setMode('ace/mode/javascript');
  } else if (selectedMappingLanguage.value === 'jsonata') {
    editor.value.getSession().setMode('ace/mode/jsoniq');
  } else {
    editor.value.getSession().setMode('ace/mode/text');
  }
}

function validateConfig(config: string, currentInput: unknown) {
  if (!usesMappingFunction.value) {
    resultIsValid.value = false;
    return;
  }

  const trimmedConfig = config.trim();
  if (trimmedConfig.length === 0) {
    resultIsValid.value = false;
    errorMessage.value = '';
    return;
  }

  const validationResult = mappingService.value.validateMappingConfig(trimmedConfig, currentInput);
  if (!validationResult.success) {
    errorMessage.value = validationResult.message;
    statusMessage.value = '';
    resultIsValid.value = false;
    saveSuggestionRetryContext(validationResult.message, trimmedConfig);
  } else {
    errorMessage.value = '';
    resultIsValid.value = true;
  }
}

function revalidateCurrentEditorContent() {
  if (!editor.value || !usesMappingFunction.value) {
    return;
  }

  const editorContent = editor.value.getValue() ?? '';
  validateConfig(editorContent, preparedInput.value);
}

function buildSelection(): RefineSchemaSelection | null {
  return refinementOptions.value?.buildSelection() ?? null;
}

function buildInferredSourceSchema(): TopLevelSchema {
  let sourceSchema = inferJsonSchema(preparedInput.value) as TopLevelSchema;
  const selection = buildSelection();

  if (usesInferredSourceSchema.value && hasSelectedRefinements.value && selection) {
    sourceSchema = runSchemaRefinement(sourceSchema, preparedInput.value, selection);
  }

  return sourceSchema;
}

async function generateMappingSuggestion() {
  if (!usesMappingFunction.value) {
    return;
  }
  if (!hasApiKey.value) {
    statusMessage.value = '';
    errorMessage.value =
      'AI-generated mapping suggestions are disabled until an API key is configured.';
    return;
  }
  if (!hasCurrentData.value) {
    statusMessage.value = '';
    errorMessage.value = 'Please load data into the Data Editor first.';
    return;
  }
  if (!hasTargetSchema.value) {
    statusMessage.value = '';
    errorMessage.value = 'Please load the target schema into the Schema Editor first.';
    return;
  }

  isLoadingMapping.value = true;
  statusMessage.value = '';
  errorMessage.value = '';

  const retryContext: DataMappingSuggestionRetryContext | undefined =
    hasValidationErrorForSuggestion.value && shouldUseRetryContext()
      ? {
          validationError: lastValidationError.value,
          previousConfig: lastFailedConfig.value,
        }
      : undefined;

  try {
    const response =
      selectedMappingMethod.value === 'source-data'
        ? await generateMappingFunctionSuggestion({
            language: selectedMappingLanguage.value,
            method: 'source-data',
            inputData: preparedInput.value,
            targetSchema: targetSchema.value,
            userComments: userComments.value,
            retryContext,
          })
        : await generateMappingFunctionSuggestion({
            language: selectedMappingLanguage.value,
            method: 'inferred-source-schema',
            sourceSchema: buildInferredSourceSchema(),
            targetSchema: targetSchema.value,
            userComments: userComments.value,
            retryContext,
          });

    result.value = response.config;
    if (response.success) {
      statusMessage.value = response.message;
      errorMessage.value = '';
      clearSuggestionRetryContext();
    } else {
      statusMessage.value = '';
      errorMessage.value = response.message;
    }

    validateConfig(response.config, preparedInput.value);
  } catch (error) {
    useErrorService().onError(error);
  } finally {
    isLoadingMapping.value = false;
  }
}

function performMapping() {
  const config = editor.value?.getValue()?.trim();
  if (!config) {
    errorMessage.value = 'No mapping configuration available.';
    statusMessage.value = '';
    return;
  }

  mappingService.value.performDataMapping(preparedInput.value, config).then(res => {
    if (res.success) {
      statusMessage.value = res.message;
      errorMessage.value = '';
      clearSuggestionRetryContext();
      dataEditorLink.setData(res.resultData);
      toastService.add({
        severity: 'success',
        summary: 'Data mapped',
        detail: res.message,
        life: 3000,
      });
      hideDialog();
    } else {
      statusMessage.value = '';
      errorMessage.value = res.message;
      saveSuggestionRetryContext(res.message, config);
    }
  });
}

async function executeDirectAiMapping() {
  if (!hasApiKey.value) {
    statusMessage.value = '';
    errorMessage.value = 'Direct AI mapping is disabled until an API key is configured.';
    return;
  }
  if (!hasCurrentData.value) {
    statusMessage.value = '';
    errorMessage.value = 'Please load data into the Data Editor first.';
    return;
  }
  if (!hasTargetSchema.value) {
    statusMessage.value = '';
    errorMessage.value = 'Please load the target schema into the Schema Editor first.';
    return;
  }

  isLoadingMapping.value = true;
  statusMessage.value = '';
  errorMessage.value = '';

  try {
    const response = await performDirectAiTargetSchemaMapping(
      rawInput.value,
      targetSchema.value,
      userComments.value
    );

    if (!response.success) {
      errorMessage.value = response.message;
      return;
    }

    const validationResult = validateAgainstTargetSchema(response.resultData);
    if (!validationResult.success) {
      errorMessage.value = validationResult.message;
      return;
    }

    dataEditorLink.setData(response.resultData);
    toastService.add({
      severity: 'success',
      summary: 'Data mapped',
      detail: response.message,
      life: 3000,
    });
    hideDialog();
  } catch (error) {
    useErrorService().onError(error);
  } finally {
    isLoadingMapping.value = false;
  }
}

function validateAgainstTargetSchema(resultData: unknown): {success: boolean; message: string} {
  try {
    const validationResult = new ValidationService(targetSchema.value).validate(resultData);
    if (validationResult.valid) {
      return {success: true, message: 'Result matches the target schema.'};
    }

    return {
      success: false,
      message: `The AI result does not match the target schema. ${formatValidationErrors(
        validationResult.errors
      )}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `The AI result could not be validated against the target schema. ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function formatValidationErrors(errors: {instancePath?: string; message?: string}[]): string {
  return errors
    .slice(0, 3)
    .map(error => {
      const location =
        error.instancePath && error.instancePath.length > 0 ? error.instancePath : '/';
      const message = error.message ?? 'Unknown validation error';
      return `${location}: ${message}`;
    })
    .join(' | ');
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
        <span v-html="mappingLanguageWarning"></span>
      </Message>

      <Message v-if="!hasApiKey" severity="info" :closable="false">
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
        :disabled="!hasApiKey || !hasCurrentData || !hasTargetSchema || isLoadingMapping" />

      <Button
        v-else
        label="Execute AI Mapping"
        icon="pi pi-play"
        @click="executeDirectAiMapping"
        class="w-full"
        :loading="isLoadingMapping"
        :disabled="!hasApiKey || !hasCurrentData || !hasTargetSchema || isLoadingMapping" />

      <div v-show="usesMappingFunction" class="mapping-editor-section">
        <Divider />
        <label :for="editorId" class="block font-semibold mb-2">Mapping Function</label>
        <div class="editor-wrapper">
          <div :id="editorId" class="editor-surface" />
        </div>
        <Button
          v-if="resultIsValid"
          label="Perform Mapping"
          icon="pi pi-play"
          class="mt-4 w-full"
          @click="performMapping" />
      </div>

      <Message severity="info" v-if="statusMessage.length">{{ statusMessage }}</Message>
      <Message severity="error" v-if="errorMessage.length">
        <span v-html="errorMessage"></span>
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

:deep(.refinement-panel .p-panel-header) {
  padding: 1rem;
}

:deep(.refinement-panel .p-panel-content) {
  padding: 1rem;
}
</style>
