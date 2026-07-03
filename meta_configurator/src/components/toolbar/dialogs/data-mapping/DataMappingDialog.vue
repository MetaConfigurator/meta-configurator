<script setup lang="ts">
import {ref, computed, watch, type Ref, onMounted, nextTick} from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {DataMappingServiceStml} from '@/data-mapping/stml/dataMappingServiceStml';
import {DataMappingServiceJavascript} from '@/data-mapping/javascript/dataMappingServiceJavascript';
import {DataMappingServiceJsonata} from '@/data-mapping/jsonata/dataMappingServiceJsonata';
import type {
  DataMappingService,
  DataMappingSuggestionRetryContext,
} from '@/data-mapping/dataMappingService';
import type {Editor} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/mode/jsoniq';
import 'brace/mode/text';
import {setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {useSettings} from '@/settings/useSettings';
import {useDebounceFn} from '@vueuse/core';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {getApiKeyRef} from '@/utility/ai/apiKey';

const showDialog = ref(false);
const editorId = 'data-mapping-' + Math.random();
const editorInitialized: Ref<boolean> = ref(false);
const editor: Ref<Editor | null> = ref(null);
const input = ref({});
const result = ref('');
const resultIsValid = ref(false);
const statusMessage = ref('');
const errorMessage = ref('');
const userComments = ref('');
const isLoadingMapping = ref(false);
const hasValidationErrorForSuggestion = ref(false);
const lastValidationError = ref('');
const lastFailedConfig = ref('');

const apiKey = getApiKeyRef();
const settings = useSettings();
const hasApiKey = computed(() => apiKey.value.trim().length > 0);
const formatProcessingUrl = computed(() => settings.value.backend.formatProcessingUrl);
const formatProcessingNotice = computed(
  () =>
    `For AI-assisted mapping suggestions, a reduced preview of the current data may be sent to the configured format processing service at ${formatProcessingUrl.value}.`
);
const formatProcessingFallbackNotice = computed(
  () =>
    'If the format processing service is unavailable, AI mapping suggestions still work without backend preprocessing. Parser-specific hints are simply omitted.'
);

const mappingServiceTypes = [
  'Advanced (JSONata)',
  'JavaScript (Code)',
  'SimpleTransformationMappingLanguage (STML)',
];

const mappingServiceWarnings = [
  'The JSONata mapping service is expressive and flexible, but may generate invalid mappings for complex inputs that have to be corrected manually.',
  'JavaScript mappings execute code. Only use this mode with trusted inputs or sandboxed execution.',
  'The STML mapping service usually generates valid mappings, but it can only express simple source-to-target path mappings and value transformations.',
];

const selectedMappingServiceType = ref(mappingServiceTypes[0] ?? 'Advanced (JSONata)');

const mappingService = computed<DataMappingService>(() => {
  if (selectedMappingServiceType.value === 'SimpleTransformationMappingLanguage (STML)') {
    return new DataMappingServiceStml();
  }
  if (selectedMappingServiceType.value === 'JavaScript (Code)') {
    return new DataMappingServiceJavascript();
  }
  return new DataMappingServiceJsonata();
});

const mappingServiceWarning = computed(() => {
  const index = mappingServiceTypes.indexOf(selectedMappingServiceType.value);
  return mappingServiceWarnings[index] || '';
});

onMounted(() => {
  watch(
    () => result.value,
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
    if (result.value.length > 0) {
      editor.value?.setValue(result.value, -1);
    }
  }
});

watch(selectedMappingServiceType, () => {
  clearSuggestionRetryContext();
  updateEditorMode();
});

function openDialog() {
  resetDialog();
  input.value = getDataForMode(SessionMode.DataEditor).data.value;
  input.value = mappingService.value.sanitizeInputDocument(input.value);
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function resetDialog() {
  statusMessage.value = '';
  errorMessage.value = '';
  userComments.value = '';
  input.value = {};
  result.value = '';
  resultIsValid.value = false;
  clearSuggestionRetryContext();
}

function clearSuggestionRetryContext() {
  hasValidationErrorForSuggestion.value = false;
  lastValidationError.value = '';
  lastFailedConfig.value = '';
}

function shouldUseRetryContext(): boolean {
  return selectedMappingServiceType.value === 'JavaScript (Code)';
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
    editorInitialized.value = false;
  }

  editor.value = ace.edit(editorId);
  setupAceProperties(editor.value, settings.value);
  updateEditorMode();
  editor.value.getSession().setUseWorker(false);
  editorInitialized.value = true;

  editor.value.on(
    'change',
    useDebounceFn(() => {
      const editorContent = editor.value?.getValue();
      if (editorContent) {
        validateConfig(editorContent, input.value);
      }
    }, 100)
  );
}

function updateEditorMode() {
  if (!editor.value) {
    return;
  }

  if (selectedMappingServiceType.value === 'JavaScript (Code)') {
    editor.value.getSession().setMode('ace/mode/javascript');
  } else if (selectedMappingServiceType.value === 'Advanced (JSONata)') {
    editor.value.getSession().setMode('ace/mode/jsoniq');
  } else if (selectedMappingServiceType.value === 'SimpleTransformationMappingLanguage (STML)') {
    editor.value.getSession().setMode('ace/mode/json');
  } else {
    editor.value.getSession().setMode('ace/mode/text');
  }
}

function validateConfig(config: string, currentInput: any) {
  const validationResult = mappingService.value.validateMappingConfig(config, currentInput);
  if (!validationResult.success) {
    errorMessage.value = validationResult.message;
    statusMessage.value = '';
    resultIsValid.value = false;
    saveSuggestionRetryContext(validationResult.message, config);
  } else {
    errorMessage.value = '';
    resultIsValid.value = true;
  }
}

function generateMappingSuggestion() {
  if (!hasApiKey.value) {
    statusMessage.value = '';
    errorMessage.value =
      'AI-generated mapping suggestions are disabled until an API key is configured.';
    return;
  }

  isLoadingMapping.value = true;
  const targetSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  const retryContext: DataMappingSuggestionRetryContext | undefined =
    hasValidationErrorForSuggestion.value && shouldUseRetryContext()
      ? {
          validationError: lastValidationError.value,
          previousConfig: lastFailedConfig.value,
        }
      : undefined;

  mappingService.value
    .generateMappingSuggestion(input.value, targetSchema, userComments.value, retryContext)
    .then(res => {
      result.value = res.config;
      if (res.success) {
        statusMessage.value = res.message;
        errorMessage.value = '';
        clearSuggestionRetryContext();
      } else {
        statusMessage.value = '';
        errorMessage.value = res.message;
      }
      validateConfig(res.config, input.value);
    })
    .catch(error => {
      useErrorService().onError(error);
    })
    .finally(() => {
      isLoadingMapping.value = false;
    });
}

function performMapping() {
  const config = editor.value?.getValue();
  if (!config) {
    errorMessage.value = 'No mapping configuration available.';
    statusMessage.value = '';
    return;
  }

  mappingService.value.performDataMapping(input.value, config).then(res => {
    if (res.success) {
      statusMessage.value = res.message;
      errorMessage.value = '';
      clearSuggestionRetryContext();
      getDataForMode(SessionMode.DataEditor).setData(res.resultData);
      hideDialog();
    } else {
      statusMessage.value = '';
      errorMessage.value = res.message;
      saveSuggestionRetryContext(res.message, config);
    }
  });
}

const suggestionButtonLabel = computed(() =>
  hasValidationErrorForSuggestion.value && shouldUseRetryContext()
    ? 'Regenerate Suggestion for Previous Error'
    : 'Generate Suggestion'
);

defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Convert Data to Target Schema"
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

      <Message severity="warn">
        {{ formatProcessingNotice }}
      </Message>

      <Message severity="info">
        {{ formatProcessingFallbackNotice }}
      </Message>

      <Message severity="warn" v-if="mappingServiceWarning.length">
        <span v-html="mappingServiceWarning"></span>
      </Message>

      <Message severity="info" v-if="!hasApiKey">
        AI-generated mapping suggestions are disabled until an LLM API key is configured. You can
        still write or edit a mapping manually and run it.
      </Message>

      <p class="text-sm text-gray-700">
        This tool converts the data from the <strong>Data Editor</strong> to match the schema
        defined in the <strong>Schema Editor</strong>. You can optionally provide extra instructions
        below to guide the mapping.
      </p>

      <div>
        <label for="userComments" class="block font-semibold mb-1">Additional Mapping Hints</label>
        <InputText
          id="userComments"
          v-model="userComments"
          class="w-full"
          placeholder="e.g., rename fields, format dates..." />
      </div>

      <div class="flex items-center gap-2">
        <label class="font-semibold">Mapping Method</label>
        <Select
          v-model="selectedMappingServiceType"
          :options="mappingServiceTypes"
          class="flex-1" />
      </div>

      <Button
        :label="suggestionButtonLabel"
        icon="pi pi-wand"
        @click="generateMappingSuggestion"
        class="w-full"
        :loading="isLoadingMapping"
        :disabled="!hasApiKey || isLoadingMapping" />

      <div class="mt-6">
        <Divider />
        <label :for="editorId" class="block font-semibold mb-2">Mapping Configuration</label>
        <div class="border rounded h-72 overflow-hidden">
          <div :id="editorId" class="h-full w-full" />
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
label {
  font-size: 0.9rem;
}
</style>
