<template>
  <Dialog
    v-model:visible="showDialog"
    header="Convert JSON data to JSON-LD using RML"
    modal
    maximizable
    :style="{width: '800px', height: '800px'}">
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
            <ScrollPanel class="step-panel-scroll" style="width: 100%; height: 100%">
              <div class="step-panel step-panel-fill step-panel-scroll-body">
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
            </ScrollPanel>
          </StepPanel>
          <StepPanel value="2">
            <div class="step-panel">
              <Divider />
              <label class="block font-semibold mb-2">Mapping Configuration</label>
              <div class="editor-block">
                <codemirror
                  v-model="rmlConfig"
                  class="rml-codemirror"
                  :autofocus="false"
                  :indent-with-tab="true"
                  :tab-size="2"
                  :extensions="extensions"
                  @ready="handleReady" />
              </div>
              <Button
                :disabled="!resultIsValid"
                label="Perform Mapping"
                icon="pi pi-play"
                @click="performMapping" />
              <div v-if="errorMessage.length" class="error-box">
                <span v-html="errorMessage"></span>
              </div>
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import {ref, computed, watch, type Ref, nextTick, shallowRef} from 'vue';
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
import ScrollPanel from 'primevue/scrollpanel';
import {Codemirror} from 'vue-codemirror';
import {basicSetup} from 'codemirror';
import {syntaxHighlighting, HighlightStyle, StreamLanguage} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {EditorView} from '@codemirror/view';
import {oneDark} from '@codemirror/theme-one-dark';
import {turtle} from '@codemirror/legacy-modes/mode/turtle';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import {RmlMappingServiceStandard} from '@/rml-mapping/standard/rmlMappingServiceStandard';
import type {RmlMappingService} from '@/rml-mapping/rmlMappingService';
import {useDebounceFn} from '@vueuse/core';
import ApiKeyWarning from '@/components/panels/ai-prompts/ApiKeyWarning.vue';
import PanelSettings from '@/components/panels/shared-components/PanelSettings.vue';
import {useErrorService} from '@/utility/errorServiceInstance';
import {isDarkMode} from '@/utility/darkModeUtils';

const showDialog = ref(false);
const input = ref({});
const result = ref('');
const rmlConfig = ref('');
const view = shallowRef<EditorView | null>(null);
const resultIsValid = ref(false);
const errorMessage = ref('');
const userComments = ref('');
const isLoadingMapping = ref(false);
const activeStep = ref('1');

const mappingService: Ref<RmlMappingService> = computed(() => {
  return new RmlMappingServiceStandard();
});

const mappingServiceWarning: Ref<string> = computed(() => {
  return '';
});

const rmlHighlightStyle = HighlightStyle.define([
  {tag: tags.keyword, color: '#c792ea', fontWeight: 'bold'},
  {tag: tags.variableName, color: '#82aaff'},
  {tag: tags.string, color: '#c3e88d'},
  {tag: tags.number, color: '#f78c6c'},
  {tag: tags.operator, color: '#89ddff'},
  {tag: tags.punctuation, color: '#abb2bf'},
  {tag: tags.typeName, color: '#f07178'},
  {tag: tags.propertyName, color: '#ffcb6b'},
]);

const extensions = computed(() => [
  basicSetup,
  StreamLanguage.define(turtle),
  syntaxHighlighting(rmlHighlightStyle),
  ...(isDarkMode.value ? [oneDark] : []),
  EditorView.lineWrapping,
]);

const handleReady = (payload: {view: EditorView}) => {
  view.value = payload.view;
};

watch(showDialog, async visible => {
  if (visible) {
    await nextTick();
    rmlConfig.value = result.value;
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
  errorMessage.value = '';
  userComments.value = '';
  input.value = {};
  result.value = '';
  rmlConfig.value = '';
  resultIsValid.value = false;
}

function validateConfig(config: string, input: any) {
  const validationResult = mappingService.value.validateMappingConfig(config, input);
  if (!validationResult.success) {
    errorMessage.value = validationResult.message;
    resultIsValid.value = false;
  } else {
    errorMessage.value = '';
    resultIsValid.value = true;
  }
}

const validateLive = useDebounceFn(() => {
  if (!rmlConfig.value) return;
  validateConfig(rmlConfig.value, input.value);
}, 100);

watch(rmlConfig, () => {
  validateLive();
});

function generateMappingSuggestion() {
  isLoadingMapping.value = true;
  const targetSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  mappingService.value
    .generateMappingSuggestion(input.value, targetSchema, userComments.value)
    .then(res => {
      result.value = res.config;
      rmlConfig.value = res.config;
      activeStep.value = '2';
      if (res.success) {
        errorMessage.value = '';
      } else {
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
  const config = rmlConfig.value;
  if (!config) {
    errorMessage.value = 'No mapping configuration available.';
    return;
  }

  mappingService.value.performRmlMapping(input.value, config).then(res => {
    if (res.success) {
      errorMessage.value = '';
      getDataForMode(SessionMode.DataEditor).setData(res.resultData);
      hideDialog();
    } else {
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

.step-panel-fill {
  min-height: 0;
  flex: 1;
}

.step-panel-scroll-body {
  min-height: 100%;
}

.hints-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step-panel-scroll :deep(.p-scrollpanel-content) {
  display: block;
}

.step-panel-scroll :deep(.p-scrollpanel-wrapper) {
  height: 100%;
}

.step-panel-scroll {
  flex: 1;
  min-height: 0;
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
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.rml-codemirror {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.rml-codemirror :deep(.cm-editor) {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

.rml-codemirror :deep(.cm-content) {
  min-height: 100%;
}

.error-box {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #ffe5e5;
  color: #d8000c;
  font-size: 0.875rem;
  border: 1px solid #d8000c;
  flex-shrink: 0;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
}

.rml-codemirror :deep(.cm-scroller) {
  overflow: auto;
  height: 100%;
}
</style>
