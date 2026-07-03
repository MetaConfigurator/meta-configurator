<script setup lang="ts">
import {computed, nextTick, onMounted, ref, type Ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import type {Editor} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import {setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {useSettings} from '@/settings/useSettings';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import {
  DataImportAiService,
  type DataImportAiSchemaSource,
  type DataImportExecutionResult,
} from './dataImportAiService';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {FORMAT_PROCESSING_FILE_ACCEPT} from '@/utility/backend/formatProcessingApi';

type DataImportAiMode =
  | 'javascript_mapping'
  | 'direct_parse'
  | 'ai_normalize_parsed'
  | 'full_ai_import';

type PendingImportConfirmation = {
  resultData: unknown;
  schemaSource: DataImportAiSchemaSource;
  mode: DataImportAiMode;
  editorSnapshot: string;
  confirmedMessage: string;
};

const showDialog = ref(false);
const editorId = 'data-import-ai-' + Math.random();
const editorInitialized: Ref<boolean> = ref(false);
const editor: Ref<Editor | null> = ref(null);

const selectedFileName = ref('');
const selectedFileSize = ref(0);
const selectedFileType = ref('');
const uploadedContent = ref('');
const userComments = ref('');
const statusMessage = ref('');
const errorMessage = ref('');
const warningMessage = ref('');
const formatDetectionMessage = ref('');
const backendDisplayText = ref('');
const backendPromptHint = ref('');
const backendRecognized = ref(false);
const isFormatProcessingUnavailable = ref(false);
const parsedJsonFromBackend: Ref<unknown | null> = ref(null);
const preprocessedJsonForAi: Ref<unknown | null> = ref(null);
const selectedImportMode = ref<DataImportAiMode>('javascript_mapping');
const jsInputMode = ref<'raw' | 'parsed'>('raw');
const inferSchemaOption = 'Infer schema from imported data';
const useCurrentSchemaOption = 'Use current schema from app';
const schemaSourceOptions = [inferSchemaOption, useCurrentSchemaOption];
const selectedSchemaSource = ref(inferSchemaOption);
const isLoadingSuggestion = ref(false);
const isImportingData = ref(false);
const isDetectingFormat = ref(false);
const hasValidationErrorForSuggestion = ref(false);
const lastValidationError = ref('');
const lastFailedScript = ref('');
const pendingImportConfirmation: Ref<PendingImportConfirmation | null> = ref(null);
const generatedScript = ref(`function transform(input) {
  return input;
}`);

const settings = useSettings();
const apiKey = getApiKeyRef();
const dataImportAiService = new DataImportAiService();
const formatProcessingUrl = computed(() => settings.value.backend.formatProcessingUrl);
const hasApiKey = computed(() => apiKey.value.trim().length > 0);
const formatProcessingUnavailableNotice = computed(
  () =>
    `The format processing service at ${formatProcessingUrl.value} is currently unavailable. Backend-dependent modes are disabled. Manual JavaScript import and full AI import remain available.`
);
const formatProcessingFallbackNotice = computed(
  () =>
    'If the format processing service is unavailable, only backend-dependent modes are affected. Manual JavaScript import and full AI import remain available.'
);
const canUseDirectParse = computed(
  () => backendRecognized.value && parsedJsonFromBackend.value !== null
);
const canUseAiNormalizeParsed = computed(() => canUseDirectParse.value && hasApiKey.value);
const importModeOptions = computed(() => {
  return [
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
    {
      label: 'Use parsed result and AI normalize it',
      value: 'ai_normalize_parsed' as DataImportAiMode,
      disabled: !canUseAiNormalizeParsed.value,
    },
    {
      label: 'Full AI import',
      value: 'full_ai_import' as DataImportAiMode,
      disabled: !hasApiKey.value,
    },
  ];
});
const usesJavascriptStep = computed(
  () =>
    selectedImportMode.value === 'javascript_mapping' ||
    selectedImportMode.value === 'ai_normalize_parsed'
);
const isCurrentImportModeDisabled = computed(() =>
  importModeOptions.value.some(
    option => option.value === selectedImportMode.value && option.disabled === true
  )
);

onMounted(() => {
  watch(
    () => generatedScript.value,
    newValue => {
      if (newValue.length > 0 && editor.value) {
        editor.value.setValue(newValue, -1);
      }
    }
  );
});

watch(showDialog, async visible => {
  if (visible) {
    await nextTick();
    initializeEditor();
    editor.value?.setValue(generatedScript.value, -1);
  }
});

watch([canUseDirectParse, hasApiKey], () => {
  if (isCurrentImportModeDisabled.value) {
    selectedImportMode.value = getDefaultImportMode();
  }
});

watch([selectedImportMode, selectedSchemaSource], () => {
  clearPendingImportConfirmation();
});

function openDialog() {
  resetDialog();
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function resetDialog() {
  selectedFileName.value = '';
  selectedFileSize.value = 0;
  selectedFileType.value = '';
  uploadedContent.value = '';
  userComments.value = '';
  statusMessage.value = '';
  errorMessage.value = '';
  warningMessage.value = '';
  formatDetectionMessage.value = '';
  backendDisplayText.value = '';
  backendPromptHint.value = '';
  backendRecognized.value = false;
  isFormatProcessingUnavailable.value = false;
  parsedJsonFromBackend.value = null;
  preprocessedJsonForAi.value = null;
  selectedImportMode.value = 'javascript_mapping';
  jsInputMode.value = 'raw';
  selectedSchemaSource.value = getDefaultSchemaSourceOption();
  clearSuggestionRetryContext();
  generatedScript.value = `function transform(input) {
  return input;
}`;
  clearPendingImportConfirmation();
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
  return selectedSchemaSource.value === useCurrentSchemaOption
    ? 'use_current_schema'
    : 'infer_from_data';
}

function getDefaultImportMode(): DataImportAiMode {
  if (canUseDirectParse.value) {
    return 'direct_parse';
  }
  return 'javascript_mapping';
}

function getEditorSnapshot(): string {
  return usesJavascriptStep.value ? getCurrentScript() : '';
}

function getCurrentScript(): string {
  return editor.value?.getValue() ?? generatedScript.value;
}

function finalizeImport(
  resultData: unknown,
  schemaSource: DataImportAiSchemaSource,
  message: string
) {
  getDataForMode(SessionMode.DataEditor).setData(resultData);
  if (schemaSource === 'infer_from_data') {
    getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = inferJsonSchema(resultData);
  }
  statusMessage.value = message;
  errorMessage.value = '';
  clearPendingImportConfirmation();
  hideDialog();
}

function maybeConfirmPendingImport(
  mode: DataImportAiMode,
  schemaSource: DataImportAiSchemaSource,
  editorSnapshot: string
): boolean {
  const pending = pendingImportConfirmation.value;
  if (!pending) {
    return false;
  }

  const matchesCurrentContext =
    pending.mode === mode &&
    pending.schemaSource === schemaSource &&
    pending.editorSnapshot === editorSnapshot;

  if (!matchesCurrentContext) {
    clearPendingImportConfirmation();
    return false;
  }

  finalizeImport(pending.resultData, pending.schemaSource, pending.confirmedMessage);
  return true;
}

function handleImportResult(
  result: DataImportExecutionResult,
  schemaSource: DataImportAiSchemaSource,
  mode: DataImportAiMode,
  editorSnapshot: string
) {
  if (!result.success) {
    statusMessage.value = '';
    errorMessage.value = result.message;
    clearPendingImportConfirmation();
    return;
  }

  if (result.requiresConfirmation) {
    pendingImportConfirmation.value = {
      resultData: result.resultData,
      schemaSource,
      mode,
      editorSnapshot,
      confirmedMessage: result.confirmedMessage ?? 'Data imported despite schema mismatch warning.',
    };
    statusMessage.value = result.message;
    errorMessage.value = '';
    warningMessage.value = result.warningMessage ?? result.message;
    return;
  }

  finalizeImport(result.resultData, schemaSource, result.message);
}

function hasCurrentSchema(): boolean {
  const currentSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  return !!currentSchema && Object.keys(currentSchema).length > 0;
}

function getDefaultSchemaSourceOption(): string {
  return hasCurrentSchema() ? useCurrentSchemaOption : inferSchemaOption;
}

function initializeEditor() {
  const container = document.getElementById(editorId);
  if (!container) {
    return;
  }

  if (editor.value) {
    editor.value.destroy();
    editor.value.container.innerHTML = '';
    editor.value = null;
    editorInitialized.value = false;
  }

  editor.value = ace.edit(editorId);
  setupAceProperties(editor.value, settings.value);
  editor.value.getSession().setMode('ace/mode/javascript');
  editor.value.getSession().setUseWorker(false);
  editorInitialized.value = true;
}

function onFileSelected(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  const file = inputElement.files?.[0];

  if (!file) {
    selectedFileName.value = '';
    selectedFileSize.value = 0;
    selectedFileType.value = '';
    uploadedContent.value = '';
    formatDetectionMessage.value = '';
    backendDisplayText.value = '';
    backendPromptHint.value = '';
    backendRecognized.value = false;
    isFormatProcessingUnavailable.value = false;
    parsedJsonFromBackend.value = null;
    preprocessedJsonForAi.value = null;
    selectedImportMode.value = getDefaultImportMode();
    jsInputMode.value = 'raw';
    clearSuggestionRetryContext();
    clearPendingImportConfirmation();
    return;
  }

  selectedFileName.value = file.name;
  selectedFileSize.value = file.size;
  selectedFileType.value = file.type || '';

  const reader = new FileReader();
  reader.onload = async () => {
    uploadedContent.value = dataImportAiService.sanitizeInputDocument(String(reader.result ?? ''));
    clearSuggestionRetryContext();
    clearPendingImportConfirmation();
    formatDetectionMessage.value = '';
    backendDisplayText.value = '';
    backendPromptHint.value = '';
    backendRecognized.value = false;
    isFormatProcessingUnavailable.value = false;
    parsedJsonFromBackend.value = null;
    preprocessedJsonForAi.value = null;
    selectedImportMode.value = 'javascript_mapping';

    if (uploadedContent.value.length === 0) {
      return;
    }

    isDetectingFormat.value = true;
    try {
      const detectionResult = await dataImportAiService.detectFormatAndParseInBackend(
        selectedFileName.value,
        selectedFileType.value,
        uploadedContent.value
      );
      isFormatProcessingUnavailable.value = detectionResult.message.includes(
        'Backend format detection unavailable'
      );
      backendRecognized.value = detectionResult.recognized;
      backendDisplayText.value = detectionResult.display_text ?? detectionResult.message;
      backendPromptHint.value = detectionResult.ai_prompt_hint ?? '';
      parsedJsonFromBackend.value =
        detectionResult.recognized && detectionResult.parsed_json !== undefined
          ? detectionResult.parsed_json
          : null;
      preprocessedJsonForAi.value =
        detectionResult.recognized && detectionResult.preprocessed_for_ai !== undefined
          ? detectionResult.preprocessed_for_ai
          : null;
      formatDetectionMessage.value = backendDisplayText.value;
      selectedImportMode.value = getDefaultImportMode();
    } finally {
      isDetectingFormat.value = false;
    }
  };
  reader.onerror = () => {
    errorMessage.value = 'Failed to read selected file.';
  };
  reader.readAsText(file);
}

function generateSuggestion() {
  if (uploadedContent.value.length === 0) {
    statusMessage.value = '';
    errorMessage.value = 'Please select a file first.';
    return;
  }
  if (!hasApiKey.value) {
    statusMessage.value = '';
    errorMessage.value = 'AI suggestion generation is disabled until an API key is configured.';
    return;
  }
  if (selectedImportMode.value === 'ai_normalize_parsed' && !canUseDirectParse.value) {
    statusMessage.value = '';
    errorMessage.value = 'AI normalization requires parsed backend data.';
    return;
  }

  clearPendingImportConfirmation();

  const schemaSource = getSelectedSchemaSource();
  const currentSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  isLoadingSuggestion.value = true;
  statusMessage.value =
    selectedImportMode.value === 'ai_normalize_parsed'
      ? 'Generating AI normalization JavaScript from parsed backend data...'
      : hasValidationErrorForSuggestion.value
        ? 'Generating improved JavaScript parser suggestion based on the validation error...'
        : 'Generating JavaScript parser suggestion...';
  errorMessage.value = '';

  const suggestionPromise =
    selectedImportMode.value === 'ai_normalize_parsed' && canUseDirectParse.value
      ? dataImportAiService.generateNormalizationSuggestionFromParsedData(
          parsedJsonFromBackend.value,
          preprocessedJsonForAi.value ?? parsedJsonFromBackend.value,
          userComments.value,
          schemaSource,
          currentSchema,
          backendDisplayText.value,
          backendPromptHint.value
        )
      : dataImportAiService.generateSuggestion(
          selectedFileName.value || 'uploaded-file',
          selectedFileType.value,
          uploadedContent.value,
          userComments.value,
          schemaSource,
          currentSchema,
          backendDisplayText.value,
          backendPromptHint.value,
          hasValidationErrorForSuggestion.value
            ? {
                validationError: lastValidationError.value,
                previousScript: lastFailedScript.value,
              }
            : undefined
        );

  suggestionPromise
    .then(result => {
      if (!result.success) {
        statusMessage.value = '';
        errorMessage.value = result.message;
        return;
      }

      generatedScript.value = result.config;
      if (editor.value) {
        editor.value.setValue(result.config, -1);
      }
      jsInputMode.value = selectedImportMode.value === 'ai_normalize_parsed' ? 'parsed' : 'raw';
      clearSuggestionRetryContext();
      statusMessage.value = result.message;
      errorMessage.value = '';
    })
    .finally(() => {
      isLoadingSuggestion.value = false;
    });
}

async function importWithAi() {
  if (uploadedContent.value.length === 0) {
    statusMessage.value = '';
    errorMessage.value = 'Please select a file first.';
    return;
  }
  const editorContent = getCurrentScript();
  if (editorContent.trim().length === 0) {
    statusMessage.value = '';
    errorMessage.value = 'No JavaScript parser available.';
    return;
  }

  const useParsedInput =
    selectedImportMode.value === 'ai_normalize_parsed' || jsInputMode.value === 'parsed';
  if (useParsedInput && parsedJsonFromBackend.value === null) {
    statusMessage.value = '';
    errorMessage.value = 'No parsed backend JSON available for AI normalization.';
    return;
  }

  const sampleInput = useParsedInput
    ? parsedJsonFromBackend.value ?? uploadedContent.value.slice(0, 2048)
    : uploadedContent.value.slice(0, 2048);
  const validation = await dataImportAiService.validateGeneratedScript(editorContent, sampleInput);
  if (!validation.success) {
    hasValidationErrorForSuggestion.value = true;
    lastValidationError.value = validation.message;
    lastFailedScript.value = editorContent;
    statusMessage.value = '';
    errorMessage.value = validation.message;
    return;
  }

  const schemaSource = getSelectedSchemaSource();
  const currentSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  if (maybeConfirmPendingImport(selectedImportMode.value, schemaSource, editorContent)) {
    return;
  }
  isImportingData.value = true;
  statusMessage.value = 'Importing data...';
  errorMessage.value = '';
  const inputForTransform = useParsedInput
    ? parsedJsonFromBackend.value ?? uploadedContent.value
    : uploadedContent.value;

  dataImportAiService
    .performImport(inputForTransform, editorContent, schemaSource, currentSchema)
    .then(result => {
      handleImportResult(result, schemaSource, selectedImportMode.value, editorContent);
    })
    .finally(() => {
      isImportingData.value = false;
    });
}

async function importDirectlyParsedJson() {
  if (!canUseDirectParse.value || parsedJsonFromBackend.value === null) {
    statusMessage.value = '';
    errorMessage.value = 'No parsed JSON is available for direct import.';
    return;
  }

  const schemaSource = getSelectedSchemaSource();
  if (maybeConfirmPendingImport('direct_parse', schemaSource, '')) {
    return;
  }

  isImportingData.value = true;
  statusMessage.value = 'Importing directly parsed data...';
  errorMessage.value = '';
  const currentSchema = getDataForMode(SessionMode.SchemaEditor).data.value;

  dataImportAiService
    .performDirectImport(parsedJsonFromBackend.value, schemaSource, currentSchema)
    .then(result => {
      const recoveredResult =
        !result.success && result.message.includes('does not match current schema')
          ? dataImportAiService.prepareImportResult(
              parsedJsonFromBackend.value,
              schemaSource,
              currentSchema,
              'Parsed JSON does not match current schema',
              'Data imported via direct backend parsing despite schema mismatch warning.',
              'Data imported successfully via direct backend parsing.'
            )
          : result;

      handleImportResult(recoveredResult, schemaSource, 'direct_parse', '');
    })
    .finally(() => {
      isImportingData.value = false;
    });
}

async function importWithFullAi() {
  if (uploadedContent.value.length === 0) {
    statusMessage.value = '';
    errorMessage.value = 'Please select a file first.';
    return;
  }
  if (!hasApiKey.value) {
    statusMessage.value = '';
    errorMessage.value = 'Full AI import is disabled until an API key is configured.';
    return;
  }

  const schemaSource = getSelectedSchemaSource();
  if (maybeConfirmPendingImport('full_ai_import', schemaSource, '')) {
    return;
  }
  isImportingData.value = true;
  statusMessage.value = 'Importing with full AI conversion...';
  errorMessage.value = '';
  const currentSchema = getDataForMode(SessionMode.SchemaEditor).data.value;

  dataImportAiService
    .performFullAiImport(
      uploadedContent.value,
      schemaSource,
      currentSchema,
      backendDisplayText.value,
      backendPromptHint.value,
      userComments.value
    )
    .then(result => {
      handleImportResult(result, schemaSource, 'full_ai_import', '');
    })
    .finally(() => {
      isImportingData.value = false;
    });
}

function importData() {
  if (selectedImportMode.value === 'full_ai_import') {
    importWithFullAi();
    return;
  }
  if (selectedImportMode.value === 'direct_parse' && canUseDirectParse.value) {
    importDirectlyParsedJson();
    return;
  }
  importWithAi();
}

defineExpose({show: openDialog, close: hideDialog});

const suggestionButtonLabel = computed(() =>
  hasValidationErrorForSuggestion.value
    ? 'Regenerate Suggestion for Previous Error'
    : selectedImportMode.value === 'ai_normalize_parsed'
      ? 'Generate AI Normalization JavaScript'
      : 'Generate JavaScript Suggestion'
);
const importButtonLabel = computed(() =>
  pendingImportConfirmation.value
    ? 'Import Anyway'
    : selectedImportMode.value === 'full_ai_import'
      ? 'Import with Full AI (No JS)'
      : selectedImportMode.value === 'direct_parse' && canUseDirectParse.value
        ? 'Import Directly (No AI Call)'
        : 'Import Data'
);
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Import Data with AI"
    :modal="true"
    :style="{width: '50vw'}">
    <div class="space-y-4">
      <PanelSettings
        panel-name="API Key and AI Settings"
        panel-display-name="API Key and AI Settings"
        settings-header="AI Settings"
        :panel-settings-path="['aiIntegration']"
        :sessionMode="SessionMode.DataEditor">
        <ApiKey />
      </PanelSettings>
      <ApiKeyWarning />

      <Message severity="warn" v-if="isFormatProcessingUnavailable">
        {{ formatProcessingUnavailableNotice }}
      </Message>

      <Message severity="info" v-if="!hasApiKey">
        AI-assisted suggestion and import modes are disabled until an LLM API key is configured.
        Backend parsing and manual JavaScript import remain available.
      </Message>

      <Message severity="info">
        {{ formatProcessingFallbackNotice }}
      </Message>

      <div class="flex items-center gap-2">
        <label class="font-semibold">Schema Source</label>
        <Select v-model="selectedSchemaSource" :options="schemaSourceOptions" class="flex-1" />
      </div>
      <p class="text-sm text-gray-400">
        Choose whether the import should infer a schema from the uploaded data or use the schema
        currently loaded in the app.
      </p>

      <div>
        <label class="block font-semibold mb-1" for="import-ai-file">Input File</label>
        <input
          id="import-ai-file"
          type="file"
          class="w-full"
          :accept="FORMAT_PROCESSING_FILE_ACCEPT"
          @change="onFileSelected" />
        <p v-if="selectedFileName.length > 0" class="text-sm mt-2">
          {{ selectedFileName }} ({{ selectedFileSize }} bytes)
        </p>
        <Message severity="info" v-if="isDetectingFormat" class="mt-2">
          Detecting format and trying backend parse...
        </Message>
        <Message
          severity="info"
          v-if="formatDetectionMessage.length > 0 && !isDetectingFormat"
          class="mt-2">
          {{ formatDetectionMessage }}
        </Message>
        <div class="mt-3 flex items-center gap-2">
          <label class="font-semibold">Import Mode</label>
          <Select
            v-model="selectedImportMode"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            :options="importModeOptions"
            class="flex-1"
            :disabled="isImportingData || isLoadingSuggestion || isDetectingFormat" />
        </div>
      </div>

      <div>
        <label class="block font-semibold mb-1">Additional Hints</label>
        <InputText
          v-model="userComments"
          class="w-full"
          placeholder="e.g. parse chemistry STAR and normalize units" />
      </div>

      <Button
        v-if="usesJavascriptStep"
        :label="suggestionButtonLabel"
        icon="pi pi-wand"
        class="w-full"
        :disabled="
          uploadedContent.length === 0 ||
          !hasApiKey ||
          isLoadingSuggestion ||
          isImportingData ||
          isDetectingFormat
        "
        :loading="isLoadingSuggestion"
        @click="generateSuggestion" />

      <div class="mt-6" v-if="usesJavascriptStep">
        <Divider />
        <label :for="editorId" class="block font-semibold mb-2">Generated JavaScript</label>
        <Textarea
          v-if="!hasApiKey"
          v-model="generatedScript"
          class="w-full import-script-textarea"
          auto-resize
          placeholder="function transform(input) {\n  return input;\n}" />
        <div v-else class="border rounded h-72 overflow-hidden">
          <div :id="editorId" class="h-full w-full" />
        </div>
      </div>

      <Button
        :label="importButtonLabel"
        icon="pi pi-play"
        class="w-full"
        :disabled="
          uploadedContent.length === 0 ||
          isCurrentImportModeDisabled ||
          isImportingData ||
          isLoadingSuggestion ||
          isDetectingFormat
        "
        :loading="isImportingData"
        @click="importData" />

      <Message severity="info" v-if="statusMessage.length">{{ statusMessage }}</Message>
      <Message severity="warn" v-if="warningMessage.length">{{ warningMessage }}</Message>
      <Message severity="error" v-if="errorMessage.length">{{ errorMessage }}</Message>
    </div>
  </Dialog>
</template>

<style scoped>
label {
  font-size: 0.9rem;
}

.import-script-textarea {
  min-height: 18rem;
  font-family: monospace;
}
</style>
