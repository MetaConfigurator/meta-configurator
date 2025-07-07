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
import {DataMappingServiceJsonata} from '@/data-mapping/jsonata/dataMappingServiceJsonata';
import type {DataMappingService} from '@/data-mapping/dataMappingService';
import type {Editor} from 'brace';
import * as ace from 'brace';
import {setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {useSettings} from '@/settings/useSettings';
import {useDebounceFn} from '@vueuse/core';
import ProgressSpinner from 'primevue/progressspinner';

const showDialog = ref(false);
const editor_id = 'data-mapping-' + Math.random();
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

const mappingServiceTypes = ['Advanced (JSONata)', 'SimpleTransformationMappingLanguage (STML)'];

const mappingServiceWarnings = [
  'The JSONata mapping service is very expressive flexible, but may generate invalid mappings for complex inputs, which have to manually be corrected.',
  'The STML mapping service usually generates valid mappings, but it can perform only simple source to target path mappings and value transformations. WARNING: It supports executing arbitrary JavaScript functions as transformations, which may lead to security issues if the input is not properly sanitized.',
];

const selectedMappingServiceType: Ref<string> = ref(mappingServiceTypes[0]);

const mappingService: Ref<DataMappingService> = computed(() => {
  if (selectedMappingServiceType.value === 'SimpleTransformationMappingLanguage (STML)') {
    return new DataMappingServiceStml();
  }
  if (selectedMappingServiceType.value === 'Advanced (JSONata)') {
    return new DataMappingServiceJsonata();
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

  mappingService.value.performDataMapping(input.value, config).then(res => {
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
    header="Convert Data to Target Schema"
    :modal="true"
    :style="{width: '50vw'}">
    <div class="space-y-4">
      <ApiKey />

      <Message severity="warn" v-if="mappingServiceWarning.length">
        <span v-html="mappingServiceWarning"></span>
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
        label="Generate Suggestion"
        icon="pi pi-wand"
        @click="generateMappingSuggestion"
        class="w-full" />
      <ProgressSpinner v-if="isLoadingMapping" />

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
