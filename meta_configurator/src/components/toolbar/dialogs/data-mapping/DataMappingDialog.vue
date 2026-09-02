<script setup lang="ts">
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import SchemaRefinementOptions from '@/components/toolbar/dialogs/shared/SchemaRefinementOptions.vue';
import {SessionMode} from '@/store/sessionMode';
import {
  MAPPING_LANGUAGE_OPTIONS,
  MAPPING_METHOD_OPTIONS,
  useDataMappingDialog,
} from '@/components/toolbar/dialogs/data-mapping/useDataMappingDialog';

const {
  showDialog,
  refinementOptions,
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
  apiKeyMessage,
  openDialog,
  hideDialog,
  generateMappingSuggestion,
  performMapping,
  executeDirectAiMapping,
} = useDataMappingDialog();

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
          :options="MAPPING_METHOD_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>

      <div v-if="usesMappingFunction" class="field-group">
        <label class="block font-semibold mb-1">Mapping Language</label>
        <Select
          v-model="selectedMappingLanguage"
          :options="MAPPING_LANGUAGE_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>

      <SchemaRefinementOptions
        v-if="usesInferredSourceSchema"
        ref="refinementOptions"
        id-prefix="mapping-inferred-source-schema"
        :show-data-independent-steps="false"
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
