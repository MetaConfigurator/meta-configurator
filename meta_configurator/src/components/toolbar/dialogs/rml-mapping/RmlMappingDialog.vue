<template>
  <Dialog
    v-model:visible="showDialog"
    header="Convert JSON data to JSON-LD using RML"
    modal
    maximizable
    :style="{width: '800px', height: '900px'}">
    <div class="rml-dialog-body">
      <Message severity="warn" v-if="mappingServiceWarning.length">
        <span v-html="mappingServiceWarning"></span>
      </Message>
      <Stepper v-model:value="activeStep" class="rml-stepper">
        <StepList>
          <Step value="1">Generate Suggestion</Step>
          <Step value="2">Apply Mapping</Step>
        </StepList>
        <StepPanels>
          <StepPanel value="1">
            <div class="step-panel">
              <PanelSettings
                panel-name="API Key and AI Settings"
                settings-header="AI Settings"
                :panel-settings-path="['aiIntegration']"
                :sessionMode="SessionMode.DataEditor">
                <ApiKey />
              </PanelSettings>
              <ApiKeyWarning />
              <p class="text-sm text-gray-700">
                This tool converts the JSON data from the <strong>Data Editor</strong> to
                <strong>JSON-LD</strong>. You can optionally provide extra instructions below to
                guide the mapping.
              </p>
              <div class="hints-block">
                <label for="userComments" class="block font-semibold mb-1">
                  Additional Mapping Hints
                </label>
                <Textarea
                  id="userComments"
                  v-model="userComments"
                  class="w-full rml-hints-textarea"
                  placeholder="e.g., rename fields, format dates..." />
              </div>
              <Button
                label="Generate Suggestion"
                icon="pi pi-wand"
                @click="generateMappingSuggestion"
                :loading="isLoadingMapping" />
            </div>
          </StepPanel>
          <StepPanel value="2">
            <div class="step-panel">
              <Divider />
              <label :for="editor_id" class="block font-semibold mb-2">Mapping Configuration</label>
              <div class="editor-block border rounded overflow-hidden">
                <div :id="editor_id" class="editor-host" />
              </div>
              <Button
                :disabled="!resultIsValid"
                label="Perform Mapping"
                icon="pi pi-play"
                @click="performMapping" />
              <Message severity="info" v-if="statusMessage.length">{{ statusMessage }}</Message>
              <Message severity="error" v-if="errorMessage.length">
                <span v-html="errorMessage"></span>
              </Message>
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import {ref, computed, watch, type Ref, onMounted, nextTick} from 'vue';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import Step from 'primevue/step';
import StepPanels from 'primevue/steppanels';
import StepPanel from 'primevue/steppanel';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {RmlMappingServiceStandard} from '@/rml-mapping/standard/rmlMappingServiceStandard';
import type {RmlMappingService} from '@/rml-mapping/rmlMappingService';
import type {Editor} from 'brace';
import * as ace from 'brace';
import {setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {useSettings} from '@/settings/useSettings';
import {useDebounceFn} from '@vueuse/core';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';

const showDialog = ref(false);
const editor_id = 'rml-mapping-' + Math.random();
const editorInitialized: Ref<boolean> = ref(false);
const editor: Ref<Editor | null> = ref(null);
const input = ref({});
const result = ref('');
const resultIsValid = ref(false);
const statusMessage = ref('aaaa');
const errorMessage = ref('addasass');
const userComments = ref('');
const isLoadingMapping = ref(false);
const activeStep = ref('1');
const settings = useSettings();

const mappingService: Ref<RmlMappingService> = computed(() => {
  return new RmlMappingServiceStandard();
});

const mappingServiceWarning: Ref<string> = computed(() => {
  return '';
});

onMounted(() => {
  watch(
    () => result.value,
    newValue => {
      if (newValue.length > 0) {
        editor.value = ace.edit(editor_id);
        editor.value?.setValue(newValue, -1);
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

function openDialog() {
  resetDialog();
  input.value = getDataForMode(SessionMode.DataEditor).data.value;
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
}

function initializeEditor() {
  const container = document.getElementById(editor_id);

  if (!container) return;

  if (editor.value) {
    editor.value.destroy();
    editor.value.container.innerHTML = '';
    editor.value = null;
    editorInitialized.value = false;
  }

  editor.value = ace.edit(editor_id);
  setupAceProperties(editor.value, settings.value);

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

function validateConfig(config: string, input: any) {
  const validationResult = mappingService.value.validateMappingConfig(config, input);
  if (!validationResult.success) {
    errorMessage.value = validationResult.message;
    statusMessage.value = '';
    resultIsValid.value = false;
  } else {
    errorMessage.value = '';
    resultIsValid.value = true;
  }
}

function generateMappingSuggestion() {
  isLoadingMapping.value = true;
  const targetSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  mappingService.value
    .generateMappingSuggestion(input.value, targetSchema, userComments.value)
    .then(res => {
      result.value = res.config;
      activeStep.value = '2';
      if (res.success) {
        statusMessage.value = res.message;
        errorMessage.value = '';
      } else {
        statusMessage.value = '';
        errorMessage.value = res.message;
      }
      isLoadingMapping.value = false;
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

  mappingService.value.performRmlMapping(input.value, config).then(res => {
    if (res.success) {
      statusMessage.value = res.message;
      errorMessage.value = '';
      getDataForMode(SessionMode.DataEditor).setData(res.resultData);
      hideDialog();
    } else {
      statusMessage.value = '';
      errorMessage.value = res.message;
    }
  });
}

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
}

.rml-stepper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.rml-stepper :deep(.p-steppanels),
.rml-stepper :deep(.p-steppanel) {
  flex: 1;
  display: flex;
  min-height: 0;
}

.rml-stepper :deep(.p-steppanel-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.step-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
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
  min-height: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  resize: none;
}

.editor-block {
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
}

.step-panel :deep(.p-message) {
  flex-shrink: 0;
}

.editor-host {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
}
</style>
