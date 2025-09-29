<script setup lang="ts">
import {computed, onMounted, ref, type Ref} from 'vue';
import {useSettings} from '@/settings/useSettings';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import * as ace from 'brace';
import {type Editor} from 'brace';
import {watchImmediate} from '@vueuse/core';
import {formatRegistry} from '@/dataformats/formatRegistry';
import {getDataForMode, getSchemaForMode, getSessionForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import _ from 'lodash';
import {pathToJsonPointer} from '@/utility/pathUtils';
import type {Path} from '@/utility/path';
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome';
import {setupAceMode, setupAceProperties} from '@/components/panels/shared-components/aceUtils';
import {
  fixAndParseGeneratedJson,
  fixGeneratedExpression,
  getApiKey,
} from '@/components/panels/ai-prompts/aiPromptUtils';
import {fetchExternalContentText} from '@/utility/fetchExternalContent';
import Panel from 'primevue/panel';
import {removeCustomFieldsFromSchema} from '@/components/panels/ai-prompts/schemaProcessor';

const props = defineProps<{
  sessionMode: SessionMode;
  defaultTextCreateDocument: string;
  defaultTextModifyDocument: string;
  defaultTextQuestionDocument: string;
  defaultTextExportDocument: string;
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
  functionQueryDocumentQuestion: (
    apiKey: string,
    prompt: string,
    currentData: string,
    schema: string
  ) => Promise<string>;
  functionQueryDocumentExport:
    | ((apiKey: string, prompt: string, currentData: string, schema: string) => Promise<string>)
    | undefined;
}>();

const settings = useSettings();
const data = getDataForMode(props.sessionMode);
const schema = getSchemaForMode(props.sessionMode);
const session = getSessionForMode(props.sessionMode);

// available export formats might be defined in the schema. Then, instead of a field for the user to describe the target format, a dropdown with the available formats is shown
// an export format is a mapping from a name to a URL where the format description can be found
// alternatively it can also map to an object with an url for an example file, as well as a textual description
const documentExportFormats: Ref<
  | {
      [k: string]: string | {url: string; description: string};
    }
  | undefined
> = computed(() => {
  const schemaValue = schema.schemaRaw.value;
  if (schemaValue !== true && schemaValue !== false) {
    if (schemaValue.metaConfigurator) {
      return schemaValue.metaConfigurator.aiExportFormats;
    }
  }
  return undefined;
});

const documentExportFormatNames: Ref<string[]> = computed(() => {
  return documentExportFormats.value ? Object.keys(documentExportFormats.value) : [];
});

// random id is used to enable multiple Ace Editors of same sessionMode on the same page
// the editor only is a fallback option if the returned response by the AI is not valid JSON
const editor_id = 'ai-prompts-' + Math.random();
const editor_id_export = 'ai-prompts-export-' + Math.random();

const promptCreateDocument: Ref<string> = ref(props.defaultTextCreateDocument);
const promptModifyDocument: Ref<string> = ref(props.defaultTextModifyDocument);
const promptQuestionDocument: Ref<string> = ref(props.defaultTextQuestionDocument);
const promptExportDocument: Ref<string> = ref(props.defaultTextExportDocument);
const selectedExportFormat: Ref<string> = ref('');

const currentElement: Ref<Path> = computed(() => {
  return session.currentSelectedElement.value;
});
const currentElementString: Ref<string> = computed(() => {
  return pathToJsonPointer(currentElement.value);
});

const isLoadingChangeAnswer: Ref<boolean> = ref(false);
const isLoadingQuestionAnswer: Ref<boolean> = ref(false);
const isLoadingExportAnswer: Ref<boolean> = ref(false);
const errorMessage: Ref<string> = ref('');
const questionResponse: Ref<string> = ref('');

// the proposed new document. Only used if it is not valid JSON, otherwise changes are made directly to the document
const newDocument: Ref<string> = ref('');
const newDocumentPath: Ref<Path> = ref([]);
const exportedDocument: Ref<string> = ref('');

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

  const editor_export: Editor = ace.edit(editor_id_export);
  setupAceProperties(editor_export, settings.value);
  watchImmediate(
    () => exportedDocument.value,
    newValue => {
      editor_export.setValue(newValue);
      editor_export.clearSelection();
    }
  );
});

function submitPromptCreateDocument() {
  const openApiKey = getApiKey();
  isLoadingChangeAnswer.value = true;
  errorMessage.value = '';
  const response = props.functionQueryDocumentCreation!(
    openApiKey,
    promptCreateDocument.value,
    JSON.stringify(removeCustomFieldsFromSchema(schema.schemaRaw.value))
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
      isLoadingChangeAnswer.value = false;
    });
}

function submitPromptModifyDocument() {
  const openApiKey = getApiKey();
  const relevantSubDocument = data.dataAt(currentElement.value);
  const relevantSubSchema = schema.schemaWrapperAtPath(currentElement.value).jsonSchema!;
  isLoadingChangeAnswer.value = true;
  errorMessage.value = '';
  const response = props.functionQueryDocumentModification(
    openApiKey,
    promptModifyDocument.value,
    JSON.stringify(relevantSubDocument),
    JSON.stringify(removeCustomFieldsFromSchema(relevantSubSchema))
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
      isLoadingChangeAnswer.value = false;
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

function submitPromptQuestionDocument() {
  const openApiKey = getApiKey();
  const relevantSubDocument = data.dataAt(currentElement.value);
  isLoadingQuestionAnswer.value = true;
  errorMessage.value = '';
  questionResponse.value = '';
  const response = props.functionQueryDocumentQuestion(
    openApiKey,
    promptQuestionDocument.value,
    JSON.stringify(relevantSubDocument),
    JSON.stringify(schema.schemaRaw.value)
  );

  response
    .then(value => {
      questionResponse.value = value;
    })
    .catch(e => {
      console.error('Invalid response', e);
      errorMessage.value = e.message;
    })
    .finally(() => {
      isLoadingQuestionAnswer.value = false;
    });
}

async function submitPromptExportDocument() {
  const openApiKey = getApiKey();
  errorMessage.value = '';

  let userPrompt = promptExportDocument.value;

  // if the schema defines export formats, the user prompt is ignored and the selected export format is used
  if (documentExportFormatNames.value.length > 0) {
    const exportFormatName = selectedExportFormat.value;
    const exportFormatDef = documentExportFormats.value![exportFormatName];
    // if export format is just a string, it is the URL
    if (typeof exportFormatDef === 'string') {
      userPrompt = await fetchExternalContentText(exportFormatDef);
    } else {
      // otherwise, it is an object with url and description
      const exampleFile = await fetchExternalContentText(exportFormatDef.url);
      userPrompt = exportFormatDef.description + '\n\n Example File: ' + exampleFile;
    }
  }

  // download content from URL
  isLoadingExportAnswer.value = true;
  const response = props.functionQueryDocumentExport!(
    openApiKey,
    userPrompt,
    JSON.stringify(data.data.value),
    JSON.stringify(schema.schemaRaw.value)
  );

  response
    .then(value => {
      exportedDocument.value = fixGeneratedExpression(value, ['json', 'yaml', 'xml', 'plaintext']);
    })
    .catch(e => {
      console.error('Invalid response', e);
      errorMessage.value = e.message;
    })
    .finally(() => {
      isLoadingExportAnswer.value = false;
    });
}

function isDocumentEmpty() {
  return _.isEmpty(data.data.value);
}
function isSchemaEmpty() {
  return _.isEmpty(schema.schemaRaw.value);
}

function selectRootElement() {
  session.currentSelectedElement.value = [];
}
</script>

<template>
  <div class="container">
    <Message severity="error" v-if="errorMessage.length > 0">{{ errorMessage }}</Message>
    <div class="p-5 space-y-3">
      <!-- Create Document Prompt -->
      <div
        class="flex flex-col space-y-4"
        v-if="isDocumentEmpty() && props.functionQueryDocumentCreation !== undefined">
        <label>Prompt to Create {{ props.labelDocumentType }}</label>
        <Textarea v-model="promptCreateDocument" />
        <Button @click="submitPromptCreateDocument()">Create {{ props.labelDocumentType }}</Button>
        <ProgressSpinner v-if="isLoadingChangeAnswer" />
      </div>

      <!-- Modify Document Prompt -->
      <Panel header="Modify Document" toggleable :collapsed="false" v-else>
        <div class="flex flex-col space-y-4">
          <span>
            <label>Prompt to</label>
            <b> Modify </b>
            <i v-if="currentElementString.length == 0"
              >the complete {{ props.labelDocumentType }}</i
            >
            <span v-else>
              <i>{{ currentElementString }} (</i>
              <Button
                circular
                text
                size="small"
                class="special-button"
                v-tooltip="'Unselect element'"
                @click="selectRootElement()">
                <FontAwesomeIcon icon="fa-solid fa-xmark" />
              </Button>
              <i>)</i>
            </span>
            <label> and all child properties</label>
            <Button
              circular
              text
              size="small"
              class="special-button"
              v-tooltip="props.labelModifyInfo"
              v-if="props.labelModifyInfo !== undefined">
              <FontAwesomeIcon icon="fa-solid fa-circle-info" />
            </Button>
          </span>
          <Textarea v-model="promptModifyDocument" />
          <Button @click="submitPromptModifyDocument()"
            >Modify {{ props.labelDocumentType }}</Button
          >
          <ProgressSpinner v-if="isLoadingChangeAnswer" />
        </div>
      </Panel>

      <!-- Preview of resulting document, if not valid JSON; can be fixed and submitted by user -->
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

      <!-- Query Document Prompt -->
      <Panel
        header="Ask Questions about Document"
        toggleable
        :collapsed="true"
        v-if="!isDocumentEmpty()">
        <div class="flex flex-col space-y-4">
          <span>
            <label>Prompt to</label>
            <b> Ask Questions about </b>
            <i v-if="currentElementString.length == 0"
              >the complete {{ props.labelDocumentType }}</i
            >
            <span v-else>
              <i>{{ currentElementString }} (</i>
              <Button
                circular
                text
                size="small"
                class="special-button"
                v-tooltip="'Unselect element'"
                @click="selectRootElement()">
                <FontAwesomeIcon icon="fa-solid fa-xmark" />
              </Button>
              <i>)</i>
            </span>
            <label> and all child properties</label>
          </span>
          <Textarea v-model="promptQuestionDocument" />
          <Button @click="submitPromptQuestionDocument()"
            >Query {{ props.labelDocumentType }}</Button
          >
          <ProgressSpinner v-if="isLoadingQuestionAnswer" />
          <Message v-if="questionResponse.length > 0">{{ questionResponse }}</Message>
        </div>
      </Panel>

      <!-- Export Document Prompt based on user input -->
      <Panel
        header="Export Document"
        toggleable
        :collapsed="true"
        v-show="
          !isSchemaEmpty() && !isDocumentEmpty() && props.functionQueryDocumentExport !== undefined
        ">
        <div class="flex flex-col space-y-4" v-show="documentExportFormats === undefined">
          <label>Prompt to <b>Export</b> document to other format</label>
          <Textarea v-model="promptExportDocument" />
          <Button @click="submitPromptExportDocument()">Export to Target Format</Button>
          <ProgressSpinner v-if="isLoadingExportAnswer" />
        </div>

        <!-- Export Document based on pre-defined formats -->
        <div class="flex flex-col space-y-4" v-show="documentExportFormats !== undefined">
          <label><b>Export</b> document to other formats</label>
          <SelectButton v-model="selectedExportFormat" :options="documentExportFormatNames" />
          <Button @click="submitPromptExportDocument()">Export to Target Format</Button>
          <ProgressSpinner v-if="isLoadingExportAnswer" />
        </div>
        <div v-show="exportedDocument.length > 0">
          <b>Resulting Document in Target Format</b>
          <div class="parent-container">
            <div class="h-full editor" :id="editor_id_export" />
          </div>
        </div>
      </Panel>
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

.special-button {
  padding: 2px;
}
</style>
