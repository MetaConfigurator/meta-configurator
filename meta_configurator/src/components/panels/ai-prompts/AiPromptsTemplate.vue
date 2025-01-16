<script setup lang="ts">
import {computed, onMounted, ref, type Ref} from 'vue';
import {useSettings} from '@/settings/useSettings';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Divider from 'primevue/divider';
import {type Editor} from 'brace';
import * as ace from 'brace';
import {watchImmediate} from '@vueuse/core';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import _ from 'lodash';
import {pathToJsonPointer} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {setupAceMode, setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {fixAndParseGeneratedJson, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';

const props = defineProps<{
  sessionMode: SessionMode;
  defaultTextCreateDocument: string;
  defaultTextModifyDocument: string;
  labelDocumentType: string;
  labelModifyInfo: string | undefined;
  functionQueryDocumentCreation:
    | ((apiKey: string, prompt: string, schema: string) => Promise<string>)
    | undefined;
  functionQueryDocumentModification: (
    apiKey: string,
    prompt: string,
    currentData: string,
    schema: string
  ) => Promise<string>;
}>();

const settings = useSettings();
const data = getDataForMode(props.sessionMode);
const schema = getSchemaForMode(props.sessionMode);
const session = getSessionForMode(props.sessionMode);

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
// the editor only is a fallback option if the returned response by the AI is not valid JSON
const editor_id = 'ai-prompts-' + Math.random();

const promptCreateDocument: Ref<string> = ref(props.defaultTextCreateDocument);
const promptModifyDocument: Ref<string> = ref(props.defaultTextModifyDocument);

const currentElement: Ref<Path> = computed(() => {
  return session.currentSelectedElement.value;
});
const currentElementString: Ref<string> = computed(() => {
  return pathToJsonPointer(currentElement.value);
});

const isLoadingAnswer: Ref<boolean> = ref(false);
const errorMessage: Ref<string> = ref('');

// the proposed new document. Only used if it is not valid JSON, otherwise changes are made directly to the document
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

function submitPromptCreateDocument() {
  const openApiKey = getApiKey();
  isLoadingAnswer.value = true;
  errorMessage.value = '';
  const response = props.functionQueryDocumentCreation!(
    openApiKey,
    promptCreateDocument.value,
    JSON.stringify(schema.schemaRaw.value)
  );
  response
    .then(value => {
      try {
        const json = fixAndParseGeneratedJson(value);
        processResult(value, true, json, []);
      } catch (e) {
        console.error('Failed to parse JSON', e);
        processResult(value, false, null, []);
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

function submitPromptModifyDocument() {
  const openApiKey = getApiKey();
  const relevantSubDocument = data.dataAt(currentElement.value);
  isLoadingAnswer.value = true;
  errorMessage.value = '';
  const response = props.functionQueryDocumentModification(
    openApiKey,
    promptModifyDocument.value,
    JSON.stringify(relevantSubDocument),
    JSON.stringify(schema.schemaRaw.value)
  );

  response
    .then(value => {
      try {
        const json = fixAndParseGeneratedJson(value);
        processResult(value, true, json, currentElement.value);
      } catch (e) {
        console.error('Failed to parse JSON', e);
        processResult(value, false, null, currentElement.value);
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
    data.setDataAt(pathForResponse, responseObject);
  } else {
    // otherwise, the invalid response is shown to the user, who can try to figure out what went wrong and fix it
    newDocument.value = response;
    newDocumentPath.value = pathForResponse;
  }
}

function applyEditorDocument() {
  try {
    const dataFormat = settings.value.dataFormat;
    const editorContent = ace.edit(editor_id).getValue();
    // parse the data in the editor as JavaScript Object according to the parser of the current data format
    const data = formatRegistry.getFormat(dataFormat).dataConverter.parse(editorContent);
    data.setDataAt(newDocumentPath.value, data);
    newDocument.value = '';
    newDocumentPath.value = [];
  } catch (e) {
    console.error('Failed to parse JSON', e);
  }
}

function isDocumentEmpty() {
  return _.isEmpty(data.data.value);
}
</script>

<template>
  <div class="container">
    <ApiKey class="api-key-top" />
    <Divider />

    <label class="heading">AI Prompts</label>
    <Message severity="error" v-if="errorMessage.length > 0">{{ errorMessage }}</Message>
    <div class="p-5 space-y-3">
      <div
        class="flex flex-col space-y-4"
        v-if="isDocumentEmpty() && props.functionQueryDocumentCreation !== undefined">
        <label>Prompt to Create {{ props.labelDocumentType }}</label>
        <Textarea v-model="promptCreateDocument" />
        <Button @click="submitPromptCreateDocument()">Create {{ props.labelDocumentType }}</Button>
        <ProgressSpinner v-if="isLoadingAnswer" />
      </div>
      <div class="flex flex-col space-y-4" v-else>
        <span>
          <label>Prompt to Modify </label>
          <b v-if="currentElementString.length == 0">the complete {{ props.labelDocumentType }}</b>
          <b v-else>{{ currentElementString }}</b>
          <label> and all child properties</label>

          <Button
            circular
            text
            class="toolbar-button"
            size="small"
            v-tooltip="props.labelModifyInfo"
            v-if="props.labelModifyInfo !== undefined">
            <FontAwesomeIcon icon="fa-solid fa-circle-info" />
          </Button>
        </span>
        <Textarea v-model="promptModifyDocument" />
        <Button @click="submitPromptModifyDocument()">Modify {{ props.labelDocumentType }}</Button>
        <ProgressSpinner v-if="isLoadingAnswer" />
      </div>
      <div v-show="newDocument.length > 0">
        <b>Resulting {{ props.labelDocumentType }}</b>
        <Message severity="error"
          >Generated {{ props.labelDocumentType }} is not valid JSON. Please fix the errors before
          applying the change.</Message
        >
        <div class="parent-container">
          <div class="h-full editor" :id="editor_id" />
        </div>
        <Button @click="applyEditorDocument()">Apply {{ props.labelDocumentType }}</Button>
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

.api-key-top {
  margin-bottom: auto;
}
</style>
