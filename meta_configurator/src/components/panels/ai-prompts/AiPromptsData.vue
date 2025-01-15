<script setup lang="ts">
import {computed, onMounted, ref, type Ref} from "vue";
import {
  queryDataConversion,
  queryDataModification,
  querySchemaCreation,
  querySchemaModification
} from "@/utility/openai";
import {useSettings} from "@/settings/useSettings";
import Textarea from "primevue/textarea";
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from "primevue/progressspinner";
import {type Editor} from "brace";
import * as ace from "brace";
import {watchImmediate} from "@vueuse/core";
import {formatRegistry} from "@/dataformats/formatRegistry";
import {getDataForMode, getSchemaForMode, getSessionForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";
import _ from "lodash";
import {pathToJsonPointer} from "@/utility/pathUtils";
import type {Path} from "@/utility/path";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {setupAceMode, setupAceProperties} from "@/components/panels/shared-components/aceUtils";
import {fixAndParseGeneratedJson} from "@/components/panels/ai-prompts/aiPromptUtils";

const settings = useSettings();
const dataData = getDataForMode(SessionMode.DataEditor);
const dataSchema = getSchemaForMode(SessionMode.DataEditor);
const dataSession = getSessionForMode(SessionMode.DataEditor);

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
// the editor only is a fallback option if the returned response by the AI is not valid JSON
const editor_id = 'ai-prompts-' + Math.random();

const promptCreateData: Ref<string> = ref('Enter your Data in any format');
const promptModifyData: Ref<string> = ref('How do you want your Data to be modified?');

const pathWhereToModify: Ref<string> = computed(() => {
  return pathToJsonPointer(dataSession.currentSelectedElement.value);
});
const isLoadingAnswer: Ref<boolean> = ref(false);

// the proposed new document. Only used if it is not valid JSON, otherwise changes are made directly to the data
const newDocument: Ref<string> = ref('');
const newDocumentPath : Ref<Path> = ref([]);


onMounted(() => {
  const editor: Editor = ace.edit(editor_id);
  setupAceMode(editor, settings.value);
  setupAceProperties(editor, settings.value);

  // watch changes to newDocument and update the data in the editor accordingly
  watchImmediate(
      () => newDocument.value,
      newValue => {
        editor.setValue(newValue);
        editor.clearSelection();
      }
  );
});


function submitPromptCreateData() {
  const openApiKey = settings.value.openApiKey;
  isLoadingAnswer.value = true;
  const response = queryDataConversion(openApiKey, promptCreateData.value, JSON.stringify(dataSchema.schemaRaw.value));
  response.then((value) => {

    // attempt to format the schema nicely
    try {
      const json = fixAndParseGeneratedJson(value);
      processResult(value, true, json, []);
      isLoadingAnswer.value = false;
    } catch (e) {
      console.error('Failed to parse JSON', e);
      processResult(value, false, null, []);
      isLoadingAnswer.value = false;
    }
  });
}

function submitPromptModifyData() {
  const openApiKey = settings.value.openApiKey;
  const relevantData = dataData.dataAt(dataSession.currentSelectedElement.value);
  const relevantSchema = dataSchema.effectiveSchemaAtPath(dataSession.currentSelectedElement.value).schema.jsonSchema;
  isLoadingAnswer.value = true;
  const response = queryDataModification(openApiKey, promptModifyData.value, JSON.stringify(relevantData), JSON.stringify(relevantSchema));
  response.then((value) => {

    // attempt to format the schema nicely
    try {
      const json = fixAndParseGeneratedJson(value);
      processResult(value, true, json, dataSession.currentSelectedElement.value);
      isLoadingAnswer.value = false;
    } catch (e) {
      console.error('Failed to parse JSON', e);
      processResult(value, false, null, dataSession.currentSelectedElement.value);
      isLoadingAnswer.value = false;
    }
  });
}

function processResult(response: string, validJson: boolean, responseObject: any, pathForResponse: Path) {
  if (validJson) {
    // if the response is valid, it is applied directly
    newDocument.value = "";
    dataData.setDataAt(pathForResponse, responseObject);
  } else {
    // otherwise, the invalid response is shown to the user, who can try to figure out what went wrong and fix it
    newDocument.value = response;
    newDocumentPath.value = pathForResponse;
  }
}

function applyResultData() {
  try {
    const dataFormat = settings.value.dataFormat;
    const data = formatRegistry.getFormat(dataFormat).dataConverter.parse(newDocument.value);
    dataData.setDataAt(newDocumentPath.value, data);
  } catch (e) {
    console.error('Failed to parse JSON', e);
  }
}


function isDataEmpty() {
  return _.isEmpty(dataData.data.value);
}

</script>

<template>
  <label class="heading">AI Prompts (Data)</label>
  <div class="p-5 space-y-3">
    <div class="flex flex-col space-y-4" v-if="isDataEmpty()">
      <label>Prompt to convert Data to satisfy the Schema.</label>
      <Textarea v-model="promptCreateData"/>
      <Button @click="submitPromptCreateData()">Convert Data</Button>
      <ProgressSpinner v-if="isLoadingAnswer" />
    </div>
    <div class="flex flex-col space-y-4" v-else>
      <span>
      <label>Prompt to modify </label>
      <b v-if="pathWhereToModify.length==0">the complete document</b>
      <b v-else>{{pathWhereToModify}}</b>
        <label> and all child properties</label>


        <Button
            circular
            text
            class="toolbar-button"
            size="small"
            v-tooltip="'When the complete document is selected for modification, the complete document will be processed by the AI to apply the modification. If you want a modification only for a specific entity or attribute, selecting that element will help reduce the processing time for the modification and increase the quality of the result. Especially for large documents, it is not recommended to use the complete document for generating modifications.'">
          <FontAwesomeIcon icon="fa-solid fa-circle-info" />
        </Button>
      </span>
      <Textarea v-model="promptModifyData"/>
      <Button @click="submitPromptModifyData()">Modify Data</Button>
      <ProgressSpinner v-if="isLoadingAnswer" />
    </div>
    <div v-show="newDocument.length > 0 ">
      <b>Resulting Schema</b>
      <Message severity="warn">Generated Data is not valid JSON. Please fix the errors before applying the change.</Message>
      <div class="parent-container">
        <div class="h-full editor" :id="editor_id" />
      </div>
      <Button @click="applyResultData()">Apply Data</Button>
    </div>
  </div>
</template>

<style scoped>
.editor {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
}
.parent-container {
  position: relative;
  width: 100%;
  height: 400px;
}
.heading {
  font-size: 24px; /* Make the text bigger */
  font-weight: bold; /* Make the text bold */
  text-align: center; /* Center the text horizontally */
  display: block; /* Ensure the label behaves like a block element */
  margin-bottom: 10px; /* Add some space below the label */
}
</style>
