
<script setup lang="ts">
import { ref, computed, watch, type Ref, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import { SessionMode } from '@/store/sessionMode';
import { getDataForMode } from '@/data/useDataLink';
import { DataMappingServiceSimple } from '@/data-mapping/simple/dataMappingServiceSimple';
import { DataMappingServiceJSONata } from '@/data-mapping/jsonata/dataMappingServiceJSONata';
import type { DataMappingService } from '@/data-mapping/dataMappingService';
import type { Editor } from 'brace';
import * as ace from 'brace';
import { setupAceProperties } from '@/components/panels/shared-components/aceUtils';
import { useSettings } from '@/settings/useSettings';
import {useDebounceFn} from "@vueuse/core";

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

const settings = useSettings();

const mappingServiceTypes = [
  'Simple',
  'Advanced (JSONata)'
];

const selectedMappingServiceType: Ref<string> = ref(mappingServiceTypes[0]);

const mappingService: Ref<DataMappingService> = computed(() => {
  if (selectedMappingServiceType.value === 'Simple') {
    return new DataMappingServiceSimple();
  }
  if (selectedMappingServiceType.value === 'Advanced (JSONata)') {
    return new DataMappingServiceJSONata();
  }
  // Add other mapping service types here
  throw new Error('Invalid mapping service type');
});

function openDialog() {
  resetDialog();
  showDialog.value = true;
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
  if (!editorInitialized.value) {
    editor.value = ace.edit(editor_id);
    setupAceProperties(editor.value, settings.value);
    editorInitialized.value = true;


    // TODO: watch editor changes to perform validation

    editor.value.on(
        'change',
        useDebounceFn(() => {

          const editorContent = editor.value?.getValue();
          // validate mapping config
          if (editorContent) {

            const validationResult = mappingService.value.validateMappingConfig(editorContent, input.value);
            if (!validationResult.valid) {
              errorMessage.value = validationResult.error!;
              statusMessage.value = '';
            } else {
              errorMessage.value = '';
              resultIsValid.value = true;
            }
          }

        }, 100))
  }
}

onMounted(() => {
  watch(() => result.value, (newValue) => {
    if (newValue.length > 0) {
      initializeEditor();
      editor.value = ace.edit(editor_id);
      editor.value?.setValue(newValue, -1);
    }
  });
});

function hideDialog() {
  showDialog.value = false;
}

function generateMappingSuggestion() {
  input.value = getDataForMode(SessionMode.DataEditor).data.value;
  const targetSchema = getDataForMode(SessionMode.SchemaEditor).data.value;
  input.value = mappingService.value.sanitizeInputDocument(input.value);
  mappingService.value.generateMappingSuggestion(input.value, targetSchema, statusMessage, errorMessage, userComments.value)
      .then(res => {
        result.value = res;
      });
}

function performMapping() {
  const config = editor.value?.getValue();
  if (!config) {
    errorMessage.value = 'No mapping configuration available.';
    statusMessage.value = '';
    return;
  }

  mappingService.value.performDataMapping(input.value, config, statusMessage, errorMessage).then( (resultData) => {
    if (resultData === undefined) {
      // error message should be printed by corresponding mapping service
      return;
    }
    // write the result data to the data editor
    getDataForMode(SessionMode.DataEditor).setData(resultData);
    hideDialog();
  });
}

defineExpose({ show: openDialog, close: hideDialog });
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Convert Data to Target Schema" :modal="true" :style="{ width: '50vw' }">
    <div class="space-y-4">
      <ApiKey />

      <p class="text-sm text-gray-700">
        This tool converts the data from the <strong>Data Editor</strong> to match the schema defined in the <strong>Schema Editor</strong>.
        You can optionally provide extra instructions below to guide the mapping.
      </p>

      <div>
        <label for="userComments" class="block font-semibold mb-1">Additional Mapping Hints</label>
        <InputText id="userComments" v-model="userComments" class="w-full" placeholder="e.g., rename fields, format dates..."/>
      </div>

      <div class="flex items-center gap-2">
        <label class="font-semibold">Mapping Method</label>
        <Select v-model="selectedMappingServiceType" :options="mappingServiceTypes" class="flex-1"/>
      </div>

      <Button label="Generate Suggestion" icon="pi pi-wand" @click="generateMappingSuggestion" class="w-full"/>

      <div v-show="result.length > 0" class="mt-6">
        <Divider />
        <label :for="editor_id" class="block font-semibold mb-2">Suggested Mapping Configuration</label>
        <div class="border rounded h-72 overflow-hidden">
          <div :id="editor_id" class="h-full w-full" />
        </div>
        <Button v-if="resultIsValid" label="Perform Mapping" icon="pi pi-play" class="mt-4 w-full" @click="performMapping"/>
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