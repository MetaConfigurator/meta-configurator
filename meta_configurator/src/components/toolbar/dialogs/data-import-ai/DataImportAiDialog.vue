<script setup lang="ts">
import {reactive} from 'vue';
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
import {ADVANCED_DATA_IMPORT_FILE_ACCEPT} from '@/utility/backend/formatProcessingApi';
import {SCHEMA_SOURCE_OPTIONS, useDataImportAiDialog} from './useDataImportAiDialog';

// reactive() unwraps the refs of the composable, so the template reads them as dialog.<name>
const dialog = reactive(useDataImportAiDialog());

defineExpose({show: dialog.openDialog, close: dialog.hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="dialog.showDialog"
    header="Advanced Data Import"
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

      <Message severity="warn" v-if="dialog.formatProcessingErrorMessage.length > 0">
        {{ dialog.formatProcessingErrorNotice }}
      </Message>

      <Message severity="info" v-if="!dialog.canUseAi">
        AI-assisted suggestion and import modes are disabled until an AI endpoint or relay is
        configured. Backend parsing and manual JavaScript import remain available.
      </Message>

      <div class="flex items-center gap-2">
        <label class="font-semibold">Schema Handling</label>
        <Select
          v-model="dialog.selectedSchemaSource"
          :options="SCHEMA_SOURCE_OPTIONS"
          class="flex-1" />
      </div>
      <p class="text-sm text-gray-400">
        Automatic handling infers a schema for regular data and leaves JSON-LD schema-free. Choose
        the current schema only when the imported data should be validated against it.
      </p>

      <div>
        <label class="block font-semibold mb-1" for="import-ai-file">Input File</label>
        <input
          id="import-ai-file"
          type="file"
          class="w-full"
          :accept="ADVANCED_DATA_IMPORT_FILE_ACCEPT"
          @change="dialog.onFileSelected" />
        <p v-if="dialog.selectedFileName.length > 0" class="text-sm mt-2">
          {{ dialog.selectedFileName }} ({{ dialog.selectedFileSize }} bytes)
        </p>
        <Message severity="info" v-if="dialog.isDetectingFormat" class="mt-2">
          Detecting format and trying backend parse...
        </Message>
        <Message
          severity="info"
          v-if="dialog.backendDisplayText.length > 0 && !dialog.isDetectingFormat"
          class="mt-2">
          {{ dialog.backendDisplayText }}
        </Message>
        <div class="mt-3 flex items-center gap-2">
          <label class="font-semibold">Import Mode</label>
          <Select
            v-model="dialog.selectedImportMode"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            :options="dialog.importModeOptions"
            class="flex-1"
            :disabled="dialog.isBusy" />
        </div>
      </div>

      <div
        v-if="dialog.selectedImportMode !== 'direct_parse'"
        data-testid="additional-import-hints">
        <label class="block font-semibold mb-1">Additional Hints</label>
        <InputText
          v-model="dialog.userComments"
          class="w-full"
          placeholder="e.g. map temperature and unit fields" />
      </div>

      <Button
        v-if="dialog.usesJavascriptStep"
        :label="dialog.suggestionButtonLabel"
        icon="pi pi-wand"
        class="w-full"
        :disabled="dialog.isSuggestionDisabled"
        :loading="dialog.isLoadingSuggestion"
        @click="dialog.generateSuggestion" />

      <div class="mt-6" v-if="dialog.usesJavascriptStep">
        <Divider />
        <label :for="dialog.editorElementId" class="block font-semibold mb-2">
          Generated JavaScript
        </label>
        <Message severity="info" :closable="false" class="mb-3">
          JavaScript runs in a Web Worker, off the main thread and without DOM access, and common
          network, import and storage calls are rejected. This keeps accidents in check rather than
          sandboxing untrusted code, so only run code you would run yourself.
        </Message>
        <Textarea
          v-if="!dialog.canUseAi"
          v-model="dialog.generatedScript"
          class="w-full import-script-textarea"
          auto-resize
          placeholder="function transform(input) {\n  return input;\n}" />
        <div v-else class="border rounded h-72 overflow-hidden">
          <div :id="dialog.editorElementId" class="h-full w-full" />
        </div>
      </div>

      <Button
        :label="dialog.importButtonLabel"
        icon="pi pi-play"
        class="w-full"
        :disabled="dialog.isImportDisabled"
        :loading="dialog.isImportingData"
        @click="dialog.importData" />

      <Message severity="info" v-if="dialog.statusMessage.length">{{
        dialog.statusMessage
      }}</Message>
      <Message severity="warn" v-if="dialog.warningMessage.length">
        {{ dialog.warningMessage }}
      </Message>
      <Message severity="error" v-if="dialog.errorMessage.length">{{
        dialog.errorMessage
      }}</Message>
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
