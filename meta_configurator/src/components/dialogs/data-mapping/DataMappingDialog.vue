<!-- Dialog to convert data to target schema using hybrid approach with AI -->
<script setup lang="ts" xmlns="http://www.w3.org/1999/html">
import {computed, onMounted, type Ref, ref, watch} from 'vue';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import type {DataMappingService} from "@/data-mapping/dataMappingService";
import {DataMappingServiceSimple} from "@/data-mapping/simple/dataMappingServiceSimple";
import {DataMappingServiceJSONata} from "@/data-mapping/jsonata/dataMappingServiceJSONata";
import {type Editor} from "brace";
import * as ace from "brace";
import { setupAceProperties} from "@/components/panels/shared-components/aceUtils";
import {useSettings} from "@/settings/useSettings";

const showDialog = ref(false);
const editor_id = 'data-mapping-' + Math.random();
const editorInitialized: Ref<boolean> = ref(false);
const editor : Ref<Editor | null> = ref(null);

const settings = useSettings();

const statusMessage: Ref<string> = ref('');
const errorMessage: Ref<string> = ref('');
const userComments: Ref<string> = ref('');

const mappingServiceTypes = [
    "Simple",
    "Advanced (JSONata)",
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


const input: Ref<any> = ref({});
const result: Ref<string> = ref('');

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
}

function initializeEditor() {
  if (editorInitialized.value) {
    return;
  }

  editor.value = ace.edit(editor_id);
  editorInitialized.value = true;
  // do not call setupAceMode because we do not want to restrain to a specific data format
  setupAceProperties(editor.value, settings.value);
}

onMounted(() => {
  // watch changes to newDocument and update the data in the editor accordingly
  watch(
      () => result.value,
      newValue => {
        if (newValue.length > 0) {
          initializeEditor()
          const editor: Editor = ace.edit(editor_id);
          editor.setValue(newValue);
          editor.clearSelection();
        }
      }
  );
});

function hideDialog() {
  showDialog.value = false;
}

function generateMappingSuggestion() {
  input.value = getDataForMode(SessionMode.DataEditor).data.value;
  const targetSchema = getDataForMode(SessionMode.SchemaEditor).data.value;

  input.value = mappingService.value.sanitizeInputDocument(input.value);

  mappingService.value.generateMappingSuggestion(input.value, targetSchema, statusMessage, errorMessage, userComments.value).then( (res) => {
    result.value = res;
  })
 }


function performMapping() {
  const editorContent = editor.value?.getValue();
  if (!editorContent) {
    errorMessage.value = 'No mapping configuration found for performing the mapping.';
    statusMessage.value = '';
    return;
  }

  mappingService.value.performDataMapping(input.value, editorContent, statusMessage, errorMessage).then( (resultData) => {
    if (resultData === undefined) {
      // error message should be printed by corresponding mapping service
      return;
    }
    // write the result data to the data editor
    getDataForMode(SessionMode.DataEditor).setData(resultData);
    hideDialog();
  });
}



defineExpose({show: openDialog, close: hideDialog});
</script>

<template>
  <Dialog v-model:visible="showDialog" header="Convert Data to Target Schema">
    <ApiKey />

    <p>
      This will convert the data in the Data Editor tab to satisfy the schema defined in the Schema Editor tab using AI.
      <br/>
      To increase the success rate, you can provide additional rules or hints for the mapping in the text field below.
    </p>

    <div class="flex flex-wrap justify-content-center gap-3 bigger-dialog-content">
        <label for="userComments" class="font-bold">Additional rules or hints for the mapping:</label>
        <InputText id="userComments" v-model="userComments" class="ml-2" style="width: 90%"/>

      <p>
        The simple method supports only mappings from path A to path B and simple transformations of a value.
        The advanced method (JSONata) supports more complex transformations and mappings but has a higher chance of creating invalid mapping configurations that need to be fixed manually.
      </p>
      <div class="vertical-center">
        <label class="font-bold">Data Mapping Method:</label>
        <Select v-model="selectedMappingServiceType" :options="mappingServiceTypes" class="ml-2"/>
      </div>

      <Button label="Generate Mapping Suggestion" @click="generateMappingSuggestion" />


      <div v-show="result.length > 0" class="justify-content-center gap-3 bigger-dialog-content">
        <Divider />
        <label :for="editor_id" class="font-bold">Suggested Mapping Configuration:</label>
        <div class="parent-container">
          <div class="h-full editor" :id="editor_id" />
        </div>
        <Button label="Perform Mapping" @click="performMapping" />
      </div>

      <Message severity="info" v-if="statusMessage.length > 0">{{ statusMessage }}</Message>
      <Message severity="error" v-if="errorMessage.length > 0">
        <span v-html="errorMessage"></span>
      </Message>
    </div>
  </Dialog>
</template>
<style scoped>
.bigger-dialog-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.vertical-center {
  display: flex;
  align-items: center;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid black;
  padding: 10px;
  text-align: center;
}

th {
  background-color: #f0f0f0;
  font-weight: bold;
}

.editor {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
}
.parent-container {
  position: relative;
  width: 500px;
  height: 300px;
}
</style>
