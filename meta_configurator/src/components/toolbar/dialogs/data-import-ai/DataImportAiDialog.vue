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
import {FORMAT_PROCESSING_FILE_ACCEPT} from '@/utility/backend/formatProcessingApi';
import {SCHEMA_SOURCE_OPTIONS, useDataImportAiDialog} from './useDataImportAiDialog';

// reactive() unwraps the refs of the composable, so the template reads them as dialog.<name>
const dialog = reactive(useDataImportAiDialog());

defineExpose({show: dialog.openDialog, close: dialog.hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="dialog.showDialog"
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

      <Message severity="warn" v-if="dialog.isFormatProcessingUnavailable">
        {{ dialog.formatProcessingUnavailableNotice }}
      </Message>

      <Message severity="info" v-if="!dialog.canUseAi">
        AI-assisted suggestion and import modes are disabled until an AI endpoint or relay is
        configured. Backend parsing and manual JavaScript import remain available.
      </Message>

      <div class="flex items-center gap-2">
        <label class="font-semibold">Schema Source</label>
        <Select
          v-model="dialog.selectedSchemaSource"
          :options="SCHEMA_SOURCE_OPTIONS"
          class="flex-1" />
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

      <div>
        <label class="block font-semibold mb-1">Additional Hints</label>
        <InputText
          v-model="dialog.userComments"
          class="w-full"
          placeholder="e.g. parse chemistry STAR and normalize units" />
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
          JavaScript runs in an isolated worker. Network access, imports, browser storage, DOM
          access, dynamic code, and long-running execution are blocked.
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
