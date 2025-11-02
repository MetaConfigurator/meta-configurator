<script setup lang="ts">
import {ref, computed, watch, type Ref, onMounted, nextTick} from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import InputSwitch from 'primevue/inputswitch';
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

const showDialog = ref(false);
const editor_id = 'rml-mapping-' + Math.random();
const editorInitialized: Ref<boolean> = ref(false);
const editor: Ref<Editor | null> = ref(null);
const input = ref({});
const result = ref('');
const resultIsValid = ref(false);
const statusMessage = ref('');
const errorMessage = ref('');
const userComments = ref('');
const isLoadingMapping = ref(false);

const settings = useSettings();

const mappingServiceTypes = ['Standard (RML)'];

const mappingServiceWarnings = ['No warnings for the RML mapping service at the moment.'];

const selectedMappingServiceType: Ref<string> = ref(mappingServiceTypes[0]);

const compactMode = ref(false);

const mappingService: Ref<RmlMappingService> = computed(() => {
  if (selectedMappingServiceType.value === 'Standard (RML)') {
    return new RmlMappingServiceStandard();
  }
  // Add other mapping service types here
  throw new Error('Invalid mapping service type');
});

const mappingServiceWarning: Ref<string> = computed(() => {
  const index = mappingServiceTypes.indexOf(selectedMappingServiceType.value);
  return mappingServiceWarnings[index] || '';
});

onMounted(() => {
  // when a new result is generated: replace the editor content with it
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
  // when the dialog turns visible, initialize the editor
  if (visible) {
    await nextTick(); // Wait until dialog content is rendered
    initializeEditor();

    if (result.value.length > 0) {
      editor.value?.setValue(result.value, -1);
    }
  }
});

function openDialog() {
  // when the dialog is opened, reset old values and load the current input data into the component, sanitize it
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
}

function initializeEditor() {
  const container = document.getElementById(editor_id);

  if (!container) {
    console.log('Unable to initialize editor because element is not found.');
    return;
  }

  // Destroy any existing editor if present
  if (editor.value) {
    editor.value.destroy();
    editor.value.container.innerHTML = ''; // Clean up old editor DOM
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
      if (res.success) {
        statusMessage.value = res.message;
        errorMessage.value = '';
      } else {
        statusMessage.value = '';
        errorMessage.value = res.message;
      }
      isLoadingMapping.value = false;
      validateConfig(res.config, input.value);
    });
}

function performMapping() {
  const config = editor.value?.getValue();
  if (!config) {
    errorMessage.value = 'No mapping configuration available.';
    statusMessage.value = '';
    return;
  }

  const parameters: Record<string, any> = {
    compactMode: compactMode.value,
  };
  mappingService.value.performRmlMapping(input.value, config, parameters).then(res => {
    if (res.success) {
      statusMessage.value = res.message;
      errorMessage.value = '';
      // write the result data to the data editor
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

<template>
  <Dialog
    v-model:visible="showDialog"
    header="Convert JSON data to JSON-LD using RML"
    :modal="true"
    :style="{width: '50vw'}">
    <div class="space-y-4">
      <PanelSettings
        panel-name="API Key and AI Settings"
        settings-header="AI Settings"
        :panel-settings-path="['aiIntegration']">
        <ApiKey />
      </PanelSettings>
      <ApiKeyWarning />
      <Message severity="warn" v-if="mappingServiceWarning.length">
        <span v-html="mappingServiceWarning"></span>
      </Message>

      <p class="text-sm text-gray-700">
        This tool converts the JSON data from the <strong>Data Editor</strong> to
        <strong>JSON-LD</strong>. You can optionally provide extra instructions below to guide the
        mapping.
      </p>

      <div>
        <label for="userComments" class="block font-semibold mb-1">Additional Mapping Hints</label>
        <InputText
          id="userComments"
          v-model="userComments"
          class="w-full"
          placeholder="e.g., rename fields, format dates..." />
      </div>

      <div
        v-if="mappingServiceTypes && mappingServiceTypes.length > 1"
        class="flex items-center gap-2">
        <label class="font-semibold">Mapping Method</label>
        <Select
          v-model="selectedMappingServiceType"
          :options="mappingServiceTypes"
          class="flex-1" />
      </div>

      <div class="flex items-center gap-2">
        <InputSwitch v-model="compactMode" />
        <label class="font-semibold">Enable JSON-LD Compact Mode</label>
      </div>

      <div v-if="compactMode">
        <p class="text-sm text-gray-600">Merges nodes into a single object if possible.</p>
      </div>
      <div v-if="!compactMode">
        <p class="text-sm text-gray-600">
          In final JSON-LD document, every triple is a separate node.
        </p>
      </div>
      <Button
        label="Generate Suggestion"
        icon="pi pi-wand"
        @click="generateMappingSuggestion"
        class="w-full"
        :loading="isLoadingMapping" />

      <div class="mt-6">
        <Divider />
        <label :for="editor_id" class="block font-semibold mb-2">Mapping Configuration</label>
        <div class="border rounded h-72 overflow-hidden">
          <div :id="editor_id" class="h-full w-full" />
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
