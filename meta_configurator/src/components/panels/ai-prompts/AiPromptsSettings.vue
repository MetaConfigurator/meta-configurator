<script setup lang="ts">
import {computed, onMounted, ref, type Ref} from 'vue';
import {queryDataModification, querySettingsModification} from '@/utility/openai';
import {useSettings} from '@/settings/useSettings';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import {type Editor} from 'brace';
import * as ace from 'brace';
import {watchImmediate} from '@vueuse/core';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {pathToJsonPointer} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {setupAceMode, setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {fixAndParseGeneratedJson, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import Divider from 'primevue/divider';

const settings = useSettings();
const settingsData = getDataForMode(SessionMode.Settings);
const settingsSchema = getSchemaForMode(SessionMode.Settings);
const settingsSession = getSessionForMode(SessionMode.Settings);

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
// the editor only is a fallback option if the returned response by the AI is not valid JSON
const editor_id = 'ai-prompts-' + Math.random();

const promptModifySettings: Ref<string> = ref('How do you want your Settings to be modified?');

const pathWhereToModify: Ref<string> = computed(() => {
  return pathToJsonPointer(settingsSession.currentSelectedElement.value);
});
const isLoadingAnswer: Ref<boolean> = ref(false);
const errorMessage: Ref<string> = ref('');

// the proposed new document. Only used if it is not valid JSON, otherwise changes are made directly to the data
const newDocument: Ref<string> = ref('');
const newDocumentPath: Ref<Path> = ref([]);

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

function submitPromptModifySettings() {
  const currentElement = settingsSession.currentSelectedElement.value;
  const openApiKey = getApiKey();
  const relevantSettings = settingsData.dataAt(currentElement);
  const relevantSchema = settingsSchema.effectiveSchemaAtPath(currentElement).schema.jsonSchema;
  isLoadingAnswer.value = true;
  errorMessage.value = '';
  const response = querySettingsModification(
    openApiKey,
    promptModifySettings.value,
    JSON.stringify(relevantSettings),
    JSON.stringify(relevantSchema)
  );
  response
    .then(value => {
      try {
        const json = fixAndParseGeneratedJson(value);
        processResult(value, true, json, currentElement);
      } catch (e) {
        console.error('Failed to parse JSON', e);
        processResult(value, false, null, currentElement);
      }
    })
    .catch(e => {
      console.error('Invalid response', e);
      errorMessage.value = e.message;
    })
    .finally(() => {
      isLoadingAnswer.value = false;
    });
}

function processResult(
  response: string,
  validJson: boolean,
  responseObject: any,
  pathForResponse: Path
) {
  if (validJson) {
    // if the response is valid, it is applied directly
    newDocument.value = '';
    settingsData.setDataAt(pathForResponse, responseObject);
  } else {
    // otherwise, the invalid response is shown to the user, who can try to figure out what went wrong and fix it
    newDocument.value = response;
    newDocumentPath.value = pathForResponse;
  }
}

function applyResultSettings() {
  try {
    const dataFormat = settings.value.dataFormat;
    const editorContent = ace.edit(editor_id).getValue();
    const data = formatRegistry.getFormat(dataFormat).dataConverter.parse(editorContent);
    settingsData.setDataAt(newDocumentPath.value, data);
    newDocument.value = '';
    newDocumentPath.value = [];
  } catch (e) {
    console.error('Failed to parse JSON', e);
    throw e;
  }
}
</script>

<template>
  <div class="container">
    <ApiKey class="api-key-top" />
    <Divider />
    <label class="heading">AI Prompts</label>
    <Message severity="error" v-if="errorMessage.length > 0">{{ errorMessage }}</Message>
    <div class="p-5 space-y-3">
      <div class="flex flex-col space-y-4">
        <span>
          <label>Prompt to modify </label>
          <b v-if="pathWhereToModify.length == 0">the complete Settings</b>
          <b v-else>{{ pathWhereToModify }}</b>
          <label> and all child properties</label>
        </span>
        <Textarea v-model="promptModifySettings" />
        <Button @click="submitPromptModifySettings()">Modify Settings</Button>
        <ProgressSpinner v-if="isLoadingAnswer" />
      </div>
      <div v-show="newDocument.length > 0">
        <b>Resulting Settings</b>
        <Message severity="error"
          >Generated Settings is not valid JSON. Please fix the errors before applying the
          change.</Message
        >
        <div class="parent-container">
          <div class="h-full editor" :id="editor_id" />
        </div>
        <Button @click="applyResultSettings()">Apply Settings</Button>
      </div>
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
