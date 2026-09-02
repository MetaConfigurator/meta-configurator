<template>
  <Dialog
    v-model:visible="showDialog"
    header="Convert JSON data to JSON-LD using RML"
    modal
    maximizable
    :style="{width: '80vw', height: '80vh'}">
    <div class="rml-dialog-body">
      <Panel header="Use AI assistance to generate RML configuration" toggleable class="rml-panel">
        <div class="step-panel">
          <PanelSettings
            panel-name="API Key and AI Settings"
            panel-display-name="API Key and AI Settings"
            settings-header="AI Settings"
            :panel-settings-path="['aiIntegration']"
            :sessionMode="SessionMode.DataEditor">
            <ApiKey />
          </PanelSettings>
          <ApiKeyWarning />
          <p class="text-sm text-gray-700">
            This tool converts the JSON data from the <strong>Data Editor</strong> to
            <strong>JSON-LD</strong>. You have to provide extra instructions below to guide the
            mapping. You can skip this step and directly paste your RML mapping configuration in the
            Mapping Configuration.
          </p>
          <div class="hints-block">
            <label for="userComments" class="block font-semibold mb-1">
              Mapping Instructions <span class="text-red-600">*</span>
            </label>
            <Textarea
              id="userComments"
              required
              v-model="userComments"
              class="w-full rml-hints-textarea"
              placeholder="Describe how to map the JSON to JSON-LD: target classes, how to build IRIs, rename fields, data types, and any joins." />
          </div>
          <Button
            label="Generate Suggestion"
            icon="pi pi-wand"
            @click="generateMappingSuggestion"
            :loading="isLoadingMapping"
            :disabled="!hasUserComments || isLoadingMapping" />
        </div>
      </Panel>
      <div class="step-panel step-panel-grow">
        <Divider />
        <label class="block font-semibold mb-2">Mapping Configuration</label>
        <div class="editor-block">
          <div ref="editorHost" class="rml-ace-editor" :id="editorElementId" />
        </div>
        <div v-if="errorMessage.length" class="error-box">
          <span v-html="errorMessage"></span>
        </div>
      </div>
    </div>
    <template #footer>
      <Button
        v-if="resultIsValid"
        label="Perform Mapping"
        icon="pi pi-play"
        @click="performMapping" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {ref, computed, watch, nextTick, onUnmounted} from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import 'brace/theme/clouds';
import 'brace/theme/clouds_midnight';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {RmlMappingServiceStandard} from '@/rml-mapping/standard/rmlMappingServiceStandard';
import {useDebounceFn} from '@vueuse/core';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {RmlCustomMode} from '@/components/panels/rdf/aceSyntaxHighlighting';
import {useAceEditor} from '@/components/panels/shared-components/useAceEditor';

const showDialog = ref(false);
const input = ref({});
const result = ref('');
const rmlConfig = ref('');
const resultIsValid = ref(false);
const errorMessage = ref('');
const userComments = ref('');
const isLoadingMapping = ref(false);
const hasUserComments = computed(() => userComments.value.trim().length > 0);
const editorHost = ref<HTMLElement | null>(null);
let editorResizeObserver: ResizeObserver | null = null;

const mappingService = new RmlMappingServiceStandard();

const validateLive = useDebounceFn(() => {
  if (!rmlConfig.value) return;
  validateConfig(rmlConfig.value);
}, 100);

const {editorElementId, editor, createEditor, destroyEditor} = useAceEditor(
  'rml-mapping-editor',
  rmlConfig,
  {mode: new (RmlCustomMode as any)(), useWrapMode: true, onContentChanged: validateLive}
);

watch(showDialog, async isDialogVisible => {
  if (!isDialogVisible) {
    stopObservingEditorResize();
    destroyEditor();
    return;
  }

  await nextTick();
  rmlConfig.value = result.value;
  createEditor();
  observeEditorResize();
  editor.value?.focus();
  // The dialog is still animating open, so resize once its final size is settled.
  window.setTimeout(() => editor.value?.resize(), 0);
});

function observeEditorResize() {
  if (!editorHost.value || editorResizeObserver) {
    return;
  }
  editorResizeObserver = new ResizeObserver(() => editor.value?.resize());
  editorResizeObserver.observe(editorHost.value);
}

function stopObservingEditorResize() {
  editorResizeObserver?.disconnect();
  editorResizeObserver = null;
}

function openDialog() {
  resetDialog();
  input.value = getDataForMode(SessionMode.DataEditor).data.value;
  showDialog.value = true;
}

function hideDialog() {
  showDialog.value = false;
}

function resetDialog() {
  errorMessage.value = '';
  userComments.value = '';
  input.value = {};
  result.value = '';
  rmlConfig.value = '';
  resultIsValid.value = false;
}

function validateConfig(config: string) {
  const validationResult = mappingService.validateMappingConfig(config);
  if (!validationResult.success) {
    errorMessage.value = validationResult.message;
    resultIsValid.value = false;
  } else {
    errorMessage.value = '';
    resultIsValid.value = true;
  }
}

function generateMappingSuggestion() {
  isLoadingMapping.value = true;
  mappingService
    .generateMappingSuggestion(input.value, userComments.value)
    .then(res => {
      result.value = res.config;
      rmlConfig.value = res.config;
      if (res.success) {
        errorMessage.value = '';
      } else {
        errorMessage.value = res.message;
      }
      isLoadingMapping.value = false;
      validateConfig(res.config);
    })
    .catch(error => {
      useErrorService().onError(error);
    })
    .finally(() => {
      isLoadingMapping.value = false;
    });
}

function performMapping() {
  const config = rmlConfig.value;
  if (!config) {
    errorMessage.value = 'No mapping configuration available.';
    return;
  }

  mappingService.performRmlMapping(input.value, config).then(res => {
    if (res.success) {
      errorMessage.value = '';
      getDataForMode(SessionMode.DataEditor).setData(res.resultData);
      hideDialog();
    } else {
      errorMessage.value = res.message;
    }
  });
}

onUnmounted(stopObservingEditorResize);

defineExpose({show: openDialog, close: hideDialog});
</script>

<style scoped>
label {
  font-size: 0.9rem;
}

.rml-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.rml-panel {
  flex: 0 0 auto;
}

.step-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-panel-grow {
  flex: 1;
  min-height: 320px;
}

.hints-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hints-block :deep(.p-textarea),
.hints-block :deep(textarea) {
  flex: 1;
  min-height: 180px;
  height: 180px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
}

.editor-block {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--p-primary-active-color);
  border-radius: 4px;
  overflow: hidden;
}

:deep(.p-dialog-content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rml-ace-editor {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.rml-ace-editor :deep(.ace_editor) {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

.error-box {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: var(--p-red-100);
  color: var(--p-red-700);
  font-size: 0.875rem;
  border: 1px solid var(--p-red-700);
  flex-shrink: 0;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
