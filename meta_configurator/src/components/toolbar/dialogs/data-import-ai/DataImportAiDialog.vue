<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
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
import 'brace/mode/javascript';
import {useAceEditor} from '@/components/panels/shared-components/useAceEditor';
import {useSettings} from '@/settings/useSettings';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import {canQueryAi} from '@/utility/ai/aiAvailability';
import {
  detectFormatAndParseInBackend,
  generateImportScriptSuggestion,
  generateNormalizationScriptSuggestion,
  runDirectParsedImport,
  runFullAiImport,
  runImportWithGeneratedScript,
  validateGeneratedImportScript,
  type DataImportAiSchemaSource,
  type DataImportExecutionResult,
} from './dataImportAiService';
import {getDataForMode, getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {FORMAT_PROCESSING_FILE_ACCEPT} from '@/utility/backend/formatProcessingApi';
import {isSchemaEmpty} from '@/schema/schemaReadingUtils';
import {readFileContent} from '@/utility/readFileContent';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';

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

const DEFAULT_TRANSFORM_SCRIPT = `function transform(input) {
  return input;
}`;
const INFER_SCHEMA_OPTION = 'Infer schema from imported data';
const USE_CURRENT_SCHEMA_OPTION = 'Use current schema from app';
const SCHEMA_SOURCE_OPTIONS = [INFER_SCHEMA_OPTION, USE_CURRENT_SCHEMA_OPTION];
/** Sample size used to smoke-test a generated parser before running the real import. */
const VALIDATION_SAMPLE_CHARACTERS = 2048;

const showDialog = ref(false);

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
const parsedJsonFromBackend = ref<unknown | null>(null);
const preprocessedJsonForAi = ref<unknown | null>(null);
const selectedImportMode = ref<DataImportAiMode>('javascript_mapping');
const javascriptInputMode = ref<'raw' | 'parsed'>('raw');
const selectedSchemaSource = ref(INFER_SCHEMA_OPTION);
const isLoadingSuggestion = ref(false);
const isImportingData = ref(false);
const isDetectingFormat = ref(false);
const hasValidationErrorForSuggestion = ref(false);
const lastValidationError = ref('');
const lastFailedScript = ref('');
const pendingImportConfirmation = ref<PendingImportConfirmation | null>(null);
const generatedScript = ref(DEFAULT_TRANSFORM_SCRIPT);

const settings = useSettings();
const apiKey = getApiKeyRef();
const {editorElementId, createEditor, destroyEditor} = useAceEditor(
  'data-import-ai',
  generatedScript,
  {mode: 'ace/mode/javascript'}
);

const canUseAi = computed(() => canQueryAi(apiKey.value));
const formatProcessingUnavailableNotice = computed(
  () =>
    `The format processing service at ${settings.value.backend.formatProcessingUrl} is currently ` +
    `unavailable. Backend-dependent modes are disabled. Manual JavaScript import and full AI ` +
    `import remain available.`
);
const canUseDirectParse = computed(
  () => backendRecognized.value && parsedJsonFromBackend.value !== null
);
const canUseAiNormalizeParsed = computed(() => canUseDirectParse.value && canUseAi.value);
const importModeOptions = computed(() => [
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
    disabled: !canUseAi.value,
  },
]);
const usesJavascriptStep = computed(
  () =>
    selectedImportMode.value === 'javascript_mapping' ||
    selectedImportMode.value === 'ai_normalize_parsed'
);
const isCurrentImportModeDisabled = computed(() =>
  importModeOptions.value.some(
    option => option.value === selectedImportMode.value && option.disabled
  )
);
const suggestionButtonLabel = computed(() => {
  if (hasValidationErrorForSuggestion.value) {
    return 'Regenerate Suggestion for Previous Error';
  }
  return selectedImportMode.value === 'ai_normalize_parsed'
    ? 'Generate AI Normalization JavaScript'
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

watch([canUseDirectParse, canUseAi], () => {
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
  clearSelectedFile();
  userComments.value = '';
  statusMessage.value = '';
  errorMessage.value = '';
  selectedSchemaSource.value = hasCurrentSchema() ? USE_CURRENT_SCHEMA_OPTION : INFER_SCHEMA_OPTION;
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

function resetFormatDetection() {
  formatDetectionMessage.value = '';
  backendDisplayText.value = '';
  backendPromptHint.value = '';
  backendRecognized.value = false;
  isFormatProcessingUnavailable.value = false;
  parsedJsonFromBackend.value = null;
  preprocessedJsonForAi.value = null;
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
  getDataForMode(SessionMode.DataEditor).setData(resultData);
  if (schemaSource === 'infer_from_data') {
    getSchemaForMode(SessionMode.DataEditor).schemaRaw.value = inferJsonSchema(resultData);
  }
  statusMessage.value = message;
  errorMessage.value = '';
  clearPendingImportConfirmation();
  hideDialog();
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
      confirmedMessage: result.confirmedMessage ?? 'Data imported despite schema mismatch warning.',
    };
    statusMessage.value = result.message;
    errorMessage.value = '';
    warningMessage.value = result.warningMessage ?? result.message;
    return;
  }

  finalizeImport(result.resultData, schemaSource, result.message);
}

async function onFileSelected(event: Event) {
  const selectedFile = (event.target as HTMLInputElement).files?.[0];
  if (!selectedFile) {
    clearSelectedFile();
    return;
  }

  selectedFileName.value = selectedFile.name;
  selectedFileSize.value = selectedFile.size;
  selectedFileType.value = selectedFile.type || '';
  try {
    uploadedContent.value = await readFileContent(selectedFile);
    clearSuggestionRetryContext();
    clearPendingImportConfirmation();
    resetFormatDetection();
    selectedImportMode.value = 'javascript_mapping';

    if (uploadedContent.value.length > 0) {
      await detectSelectedFileFormat();
    }
  } catch {
    errorMessage.value = 'Failed to read selected file.';
  }
}

function clearSelectedFile() {
  selectedFileName.value = '';
  selectedFileSize.value = 0;
  selectedFileType.value = '';
  uploadedContent.value = '';
  resetFormatDetection();
  selectedImportMode.value = getDefaultImportMode();
  javascriptInputMode.value = 'raw';
  clearSuggestionRetryContext();
  clearPendingImportConfirmation();
}

async function detectSelectedFileFormat() {
  isDetectingFormat.value = true;
  try {
    const detectionResult = await detectFormatAndParseInBackend(
      selectedFileName.value,
      selectedFileType.value,
      uploadedContent.value
    );
    isFormatProcessingUnavailable.value = detectionResult === null;

    if (detectionResult === null) {
      backendRecognized.value = false;
      backendDisplayText.value =
        'Backend format detection unavailable. Falling back to AI mapping.';
      backendPromptHint.value = '';
      parsedJsonFromBackend.value = null;
      preprocessedJsonForAi.value = null;
    } else {
      backendRecognized.value = detectionResult.recognized;
      backendDisplayText.value = detectionResult.display_text ?? detectionResult.message;
      backendPromptHint.value = detectionResult.ai_prompt_hint ?? '';
      parsedJsonFromBackend.value = detectionResult.recognized
        ? detectionResult.parsed_json ?? null
        : null;
      preprocessedJsonForAi.value = detectionResult.recognized
        ? detectionResult.preprocessed_for_ai ?? null
        : null;
    }

    formatDetectionMessage.value = backendDisplayText.value;
    selectedImportMode.value = getDefaultImportMode();
  } finally {
    isDetectingFormat.value = false;
  }
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

  const normalizesParsedData = selectedImportMode.value === 'ai_normalize_parsed';
  if (normalizesParsedData && !canUseDirectParse.value) {
    showError('AI normalization requires parsed backend data.');
    return;
  }

  clearPendingImportConfirmation();
  const schemaSource = getSelectedSchemaSource();
  isLoadingSuggestion.value = true;
  statusMessage.value = getSuggestionProgressMessage(normalizesParsedData);
  errorMessage.value = '';

  try {
    const result = normalizesParsedData
      ? await generateNormalizationScriptSuggestion({
          parsedData: parsedJsonFromBackend.value,
          preprocessedDataForAi: preprocessedJsonForAi.value ?? parsedJsonFromBackend.value,
          userComments: userComments.value,
          schemaSource,
          currentSchema: getCurrentSchema(),
          backendDisplayText: backendDisplayText.value,
          backendPromptHint: backendPromptHint.value,
        })
      : await generateImportScriptSuggestion({
          inputFileName: selectedFileName.value || 'uploaded-file',
          inputFileType: selectedFileType.value,
          inputDocument: uploadedContent.value,
          userComments: userComments.value,
          schemaSource,
          currentSchema: getCurrentSchema(),
          backendDisplayText: backendDisplayText.value,
          backendPromptHint: backendPromptHint.value,
          retryContext: hasValidationErrorForSuggestion.value
            ? {
                validationError: lastValidationError.value,
                previousCode: lastFailedScript.value,
              }
            : undefined,
        });

    if (!result.success) {
      showError(result.message);
      return;
    }

    generatedScript.value = result.config;
    javascriptInputMode.value = normalizesParsedData ? 'parsed' : 'raw';
    clearSuggestionRetryContext();
    statusMessage.value = result.message;
    errorMessage.value = '';
  } finally {
    isLoadingSuggestion.value = false;
  }
}

function getSuggestionProgressMessage(normalizesParsedData: boolean): string {
  if (normalizesParsedData) {
    return 'Generating AI normalization JavaScript from parsed backend data...';
  }
  return hasValidationErrorForSuggestion.value
    ? 'Generating improved JavaScript parser suggestion based on the validation error...'
    : 'Generating JavaScript parser suggestion...';
}

/**
 * Shared tail of every import mode: confirm a pending schema mismatch, show progress,
 * run the mode-specific import and report its outcome.
 */
async function runImport(
  mode: DataImportAiMode,
  editorSnapshot: string,
  progressMessage: string,
  executeImport: (
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined
  ) => Promise<DataImportExecutionResult>
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

  const usesParsedInput =
    selectedImportMode.value === 'ai_normalize_parsed' || javascriptInputMode.value === 'parsed';
  if (usesParsedInput && parsedJsonFromBackend.value === null) {
    showError('No parsed backend JSON available for AI normalization.');
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
    importWithFullAi();
    return;
  }
  if (selectedImportMode.value === 'direct_parse' && canUseDirectParse.value) {
    importDirectlyParsedJson();
    return;
  }
  importWithGeneratedScript();
}

defineExpose({show: openDialog, close: hideDialog});
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

      <Message severity="info" v-if="!canUseAi">
        AI-assisted suggestion and import modes are disabled until an AI endpoint or relay is
        configured. Backend parsing and manual JavaScript import remain available.
      </Message>

      <div class="flex items-center gap-2">
        <label class="font-semibold">Schema Source</label>
        <Select v-model="selectedSchemaSource" :options="SCHEMA_SOURCE_OPTIONS" class="flex-1" />
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
          !canUseAi ||
          isLoadingSuggestion ||
          isImportingData ||
          isDetectingFormat
        "
        :loading="isLoadingSuggestion"
        @click="generateSuggestion" />

      <div class="mt-6" v-if="usesJavascriptStep">
        <Divider />
        <label :for="editorElementId" class="block font-semibold mb-2">Generated JavaScript</label>
        <Message severity="info" :closable="false" class="mb-3">
          JavaScript runs in an isolated worker. Network access, imports, browser storage, DOM
          access, dynamic code, and long-running execution are blocked.
        </Message>
        <Textarea
          v-if="!canUseAi"
          v-model="generatedScript"
          class="w-full import-script-textarea"
          auto-resize
          placeholder="function transform(input) {\n  return input;\n}" />
        <div v-else class="border rounded h-72 overflow-hidden">
          <div :id="editorElementId" class="h-full w-full" />
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
