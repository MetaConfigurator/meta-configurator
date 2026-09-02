<script setup lang="ts">
import {reactive} from 'vue';
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

const dataMappingDialog = useDataMappingDialog();
// reactive() unwraps the refs of the composable, so the template reads them as dialog.<name>
const dialog = reactive(dataMappingDialog);
// The template ref has to bind to the ref itself, which reactive() would unwrap.
const refinementOptions = dataMappingDialog.refinementOptions;

defineExpose({show: dialog.openDialog, close: dialog.hideDialog});
</script>

<template>
  <Dialog
    v-model:visible="dialog.showDialog"
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
        {{ dialog.mappingMethodNotice }}
      </Message>

      <Message v-if="dialog.mappingLanguageWarning.length" severity="warn" :closable="false">
        {{ dialog.mappingLanguageWarning }}
      </Message>

      <Message v-if="!dialog.canUseAi" severity="info" :closable="false">
        {{ dialog.apiKeyMessage }}
      </Message>

      <Message v-if="!dialog.hasCurrentData" severity="warn" :closable="false">
        No data is currently loaded in the Data Editor. Load data first before converting it.
      </Message>

      <Message v-if="!dialog.hasTargetSchema" severity="warn" :closable="false">
        No target schema is currently loaded in the Schema Editor.
      </Message>

      <p class="text-sm text-gray-700">
        This tool converts the data from the <strong>Data Editor</strong> to match the schema
        defined in the <strong>Schema Editor</strong>. You can optionally provide extra instructions
        below to guide the mapping.
      </p>

      <div class="field-group">
        <label for="userComments" class="block font-semibold mb-1">
          Additional Mapping Hints
        </label>
        <InputText
          id="userComments"
          v-model="dialog.userComments"
          class="w-full"
          placeholder="e.g., rename fields, format dates..." />
      </div>

      <div class="field-group">
        <label class="block font-semibold mb-1">Mapping Method</label>
        <Select
          v-model="dialog.selectedMappingMethod"
          :options="MAPPING_METHOD_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>

      <div v-if="dialog.usesMappingFunction" class="field-group">
        <label class="block font-semibold mb-1">Mapping Language</label>
        <Select
          v-model="dialog.selectedMappingLanguage"
          :options="MAPPING_LANGUAGE_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>

      <SchemaRefinementOptions
        v-if="dialog.usesInferredSourceSchema"
        ref="refinementOptions"
        id-prefix="mapping-inferred-source-schema"
        :show-data-independent-steps="false"
        add-examples-description="Add real example values from the current input data to the locally inferred source schema before it is sent to the LLM." />

      <Button
        v-if="dialog.usesMappingFunction"
        :label="dialog.suggestionButtonLabel"
        icon="pi pi-wand"
        @click="dialog.generateMappingSuggestion"
        class="w-full"
        :loading="dialog.isLoadingMapping"
        :disabled="dialog.isMappingActionDisabled" />

      <Button
        v-else
        label="Execute AI Mapping"
        icon="pi pi-play"
        @click="dialog.executeDirectAiMapping"
        class="w-full"
        :loading="dialog.isLoadingMapping"
        :disabled="dialog.isMappingActionDisabled" />

      <div v-show="dialog.usesMappingFunction" class="mapping-editor-section">
        <Divider />
        <label :for="dialog.editorElementId" class="block font-semibold mb-2"
          >Mapping Function</label
        >
        <div class="editor-wrapper">
          <div :id="dialog.editorElementId" class="editor-surface" />
        </div>
        <Button
          v-if="dialog.mappingConfigurationIsValid"
          label="Perform Mapping"
          icon="pi pi-play"
          class="mt-4 w-full"
          @click="dialog.performMapping" />
      </div>

      <Message severity="info" v-if="dialog.statusMessage.length">{{
        dialog.statusMessage
      }}</Message>
      <Message severity="error" v-if="dialog.errorMessage.length">
        {{ dialog.errorMessage }}
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
