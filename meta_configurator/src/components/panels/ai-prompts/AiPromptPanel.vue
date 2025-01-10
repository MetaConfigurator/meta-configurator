<script setup lang="ts">
import {computed, onMounted, ref, type Ref} from "vue";
import {querySchemaCreation, querySchemaModification} from "@/utility/openai";
import {useSettings} from "@/settings/useSettings";
import Textarea from "primevue/textarea";
import Button from 'primevue/button';
import ProgressSpinner from "primevue/progressspinner";
import {type Editor} from "brace";
import * as ace from "brace";
import {watchImmediate} from "@vueuse/core";
import {formatRegistry} from "@/dataformats/formatRegistry";
import {getDataForMode, getSessionForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";
import _ from "lodash";
import {pathToJsonPointer} from "@/utility/pathUtils";

const settings = useSettings();
const schemaData = getDataForMode(SessionMode.SchemaEditor);
const sessionData = getSessionForMode(SessionMode.SchemaEditor);
// random id is used to enable multiple Ace Editors of same sessionMode on the same page
const editor_id = 'ai-prompts-' + Math.random();

const promptCreateSchema: Ref<string> = ref('Enter your Schema Description');
const promptModifySchema: Ref<string> = ref('Enter your Schema Modification Prompt');
const pathWhereToModify: Ref<string> = computed(() => {
  return pathToJsonPointer(sessionData.currentSelectedElement.value);
});
const isLoadingAnswer: Ref<boolean> = ref(false);

const availablePaths: Ref<Array<string>> = computed(() => {
  return Object.keys(schemaData.data.value);
});

const newDocument: Ref<string> = ref('{}');



onMounted(() => {
  const editor: Editor = ace.edit(editor_id);
  setupAceMode(editor);
  setupAceProperties(editor);

  // watch changes to newDocument and update the data in the editor accordingly
  watchImmediate(
      () => newDocument.value,
      newValue => {
        editor.setValue(newValue);
        editor.clearSelection();
      }
  );
});


function setupAceMode(editor: Editor) {
  watchImmediate(
      () => settings.value.dataFormat,
      format => {
        if (format == 'json') {
          editor.getSession().setMode('ace/mode/json');
        } else if (format == 'yaml') {
          editor.getSession().setMode('ace/mode/yaml');
        }
      }
  );
}

function setupAceProperties(editor: Editor) {
  editor.$blockScrolling = Infinity;
  editor.setOptions({
    autoScrollEditorIntoView: true, // this is needed if editor is inside scrollable page
  });
  editor.setTheme('ace/theme/clouds');
  editor.setShowPrintMargin(false);
  editor.getSession().setTabSize(settings.value.codeEditor.tabSize);

  // it's not clear why timeout is needed here, but without it the
  // ace editor starts flashing and becomes unusable
  window.setTimeout(() => {
    watchImmediate(
        () => settings.value.codeEditor.fontSize,
        fontSize => {
          if (editor && fontSize && fontSize > 6 && fontSize < 65) {
            editor.setFontSize(fontSize.toString() + 'px');
          }
        }
    );
  }, 0);
}


function submitPromptCreateSchema() {
  const openApiKey = settings.value.openApiKey;
  isLoadingAnswer.value = true;
  const response = querySchemaCreation(openApiKey, promptCreateSchema.value);
  response.then((value) => {
    newDocument.value = value;

    // attempt to format the schema nicely
    try {
      const json = fixAndParseGeneratedSchema(value);
      const dataFormat = settings.value.dataFormat;
      newDocument.value = formatRegistry.getFormat(dataFormat).dataConverter.stringify(json);
      isLoadingAnswer.value = false;
    } catch (e) {
      console.error('Failed to parse JSON', e);
      isLoadingAnswer.value = false;
    }
  });
}

function submitPromptModifySchema() {
  const openApiKey = settings.value.openApiKey;
  const relevantSchema = schemaData.dataAt(sessionData.currentSelectedElement.value);
  isLoadingAnswer.value = true;
  const response = querySchemaModification(openApiKey, promptCreateSchema.value, JSON.stringify(relevantSchema));
  response.then((value) => {
    newDocument.value = value;

    // attempt to format the schema nicely
    try {
      const json = fixAndParseGeneratedSchema(value);
      const dataFormat = settings.value.dataFormat;
      newDocument.value = formatRegistry.getFormat(dataFormat).dataConverter.stringify(json);
      isLoadingAnswer.value = false;
    } catch (e) {
      console.error('Failed to parse JSON', e);
      isLoadingAnswer.value = false;
    }
  });
}

function applyResultSchema() {
  try {
    const dataFormat = settings.value.dataFormat;
    const data = formatRegistry.getFormat(dataFormat).dataConverter.parse(newDocument.value);
    schemaData.setDataAt(sessionData.currentSelectedElement.value, data);
  } catch (e) {
    console.error('Failed to parse JSON', e);
  }
}

function fixAndParseGeneratedSchema(schema: string): any {
  try {
    return JSON.parse(schema);
  } catch (e) {

    if (schema.startsWith('```json\n') && schema.endsWith('```')) {
      schema = schema.substring(8, schema.length - 3);
    try {
      return JSON.parse(schema);
    }
    catch (e) {
      throw e;
    }
    }
  }
}

function isSchemaEmpty() {
  return _.isEmpty(schemaData.data.value);
}

</script>

<template>
  <label class="heading">AI Prompts</label>
  <div class="p-5 space-y-3">
    <div class="flex flex-col" v-if="isSchemaEmpty()">
      <label>Prompt to create a schema</label>
      <Textarea v-model="promptCreateSchema"/>
      <Button @click="submitPromptCreateSchema()">Create Schema</Button>
      <ProgressSpinner v-if="isLoadingAnswer" />
    </div>
    <div class="flex flex-col" v-else>
      <span>
      <label>Prompt to modify </label>
      <label v-if="pathWhereToModify.length==0">the complete schema</label>
      <label v-else>{{pathWhereToModify}}</label>
      </span>
      <Textarea v-model="promptModifySchema"/>
      <Button @click="submitPromptModifySchema()">Modify Schema</Button>
      <ProgressSpinner v-if="isLoadingAnswer" />
    </div>
    <b>Resulting Schema</b>
    <div class="parent-container">
    <div class="h-full editor" :id="editor_id" />
    </div>
      <Button @click="applyResultSchema()">Apply Schema</Button>
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
