<script setup lang="ts">
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
import {SessionMode} from '@/store/sessionMode';
import {FORMAT_PROCESSING_FILE_ACCEPT} from '@/utility/backend/formatProcessingApi';
import {SCHEMA_SOURCE_OPTIONS, useDataImportAiDialog} from './useDataImportAiDialog';

const {
  showDialog,
  selectedFileName,
  selectedFileSize,
  uploadedContent,
  userComments,
  statusMessage,
  errorMessage,
  warningMessage,
  backendDisplayText,
  isFormatProcessingUnavailable,
  selectedImportMode,
  selectedSchemaSource,
  isLoadingSuggestion,
  isImportingData,
  isDetectingFormat,
  generatedScript,
  editorElementId,
  canUseAi,
  formatProcessingUnavailableNotice,
  importModeOptions,
  usesJavascriptStep,
  isCurrentImportModeDisabled,
  suggestionButtonLabel,
  importButtonLabel,
  openDialog,
  hideDialog,
  onFileSelected,
  generateSuggestion,
  importData,
} = useDataImportAiDialog();

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
          v-if="backendDisplayText.length > 0 && !isDetectingFormat"
          class="mt-2">
          {{ backendDisplayText }}
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
