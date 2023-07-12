<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import Message from 'primevue/message';
import type {Position} from 'brace';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import Ajv2020 from 'ajv/dist/2020';

import type {Path} from '@/model/path';
import {ConfigManipulatorJson} from '@/helpers/ConfigManipulatorJson';

import {ChangeResponsible, SessionMode, useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';

const sessionStore = useSessionStore();
const dataStore = useDataStore();
const {currentSelectedElement, fileData} = storeToRefs(sessionStore);

let currentSelectionIsForcedFromOutside = false;

const editor = ref();
const userError = ref('');
const manipulator = new ConfigManipulatorJson();

onMounted(() => {
  // Set up editor mode to JSON and define theme
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/json');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  editorValueWasUpdatedFromOutside(sessionStore.fileData, sessionStore.currentSelectedElement);

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on('change', () => {
    userError.value = '';
    sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
    const jsonString = editor.value.getValue();

    // Current workaround until schema of schema editor works: just accept schema without validation
    //fileData.value = JSON.parse(jsonString);
    if (sessionStore.currentMode === SessionMode.SchemaEditor) {
      try {
        const parsedJson = JSON.parse(jsonString);
        fileData.value = parsedJson;
      } catch (e) {
        userError.value = e.toString();
      }
      return;
    }

    try {
      const parsedJson = JSON.parse(jsonString);

      const ajv = new Ajv2020();
      const validateFunction = ajv.compile(useSessionStore().fileSchemaData);

      const valid = validateFunction(parsedJson);
      if (valid) {
        fileData.value = parsedJson;
      } else {
        userError.value = 'Invalid JSON according to the schema.';
        //TODO: more detailed error message
      }
    } catch (e) {
      userError.value = e.toString();
    }
  });

  editor.value.on('changeSelection', () => {
    if (currentSelectionIsForcedFromOutside) {
      // we do not need to consider the event and send updates if the selection was forced from outside
      return;
    }
    try {
      let newPath = determinePath(editor.value.getValue(), editor.value.getCursorPosition());
      sessionStore.lastChangeResponsible = ChangeResponsible.CodeEditor;
      sessionStore.currentSelectedElement = newPath;
    } catch (e) {
      /* empty */
    }
  });

  // Listen to changes in store and update content accordingly
  watch(
    fileData,
    newVal => {
      if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
        editorValueWasUpdatedFromOutside(newVal, sessionStore.currentSelectedElement);
      }
    },
    {deep: true}
  );
  // Listen to changes in current path and update cursor accordingly
  watch(
    currentSelectedElement,
    newVal => {
      if (editor.value) {
        if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
          currentSelectionIsForcedFromOutside = true;
          updateCursorPositionBasedOnPath(
            editor.value.getValue(),
            sessionStore.currentSelectedElement
          );
          currentSelectionIsForcedFromOutside = false;
        }
      }
    },
    {deep: true}
  );
});

function editorValueWasUpdatedFromOutside(configData, currentPath: Path) {
  // Update value with new data and also update cursor position
  currentSelectionIsForcedFromOutside = true;
  const newEditorContent = JSON.stringify(configData, null, 2);
  editor.value.setValue(newEditorContent);
  updateCursorPositionBasedOnPath(newEditorContent, currentPath);
  currentSelectionIsForcedFromOutside = false;
}

function updateCursorPositionBasedOnPath(editorContent: string, currentPath: Path) {
  let position = determineCursorPosition(editorContent, currentPath);
  editor.value.gotoLine(position.row, position.column);
}

function determineCursorPosition(editorContent: string, currentPath: Path): Position {
  let index = manipulator.determineCursorPosition(editorContent, currentPath);
  let pos = editor.value.session.doc.indexToPosition(index, 0);
  return pos;
}

function determinePath(editorContent: string, cursorPosition: Position): Path {
  let targetCharacter = editor.value.session.doc.positionToIndex(cursorPosition, 0);
  return manipulator.determinePath(editorContent, targetCharacter);
}
</script>

<template>
  <Message v-if="userError" severity="error" sticky>{{ userError }}</Message>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped>
.p-component {
  margin: 0 !important;
}
</style>
