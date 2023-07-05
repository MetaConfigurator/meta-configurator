<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import _ from 'lodash';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';

import type {Path} from '@/model/path';
import {ConfigManipulatorJson} from '@/helpers/ConfigManipulatorJson';
import type {Position} from 'brace';

import {ChangeResponsible, useSessionStore} from '@/store/sessionStore';
const sessionStore = useSessionStore();
const {currentPath, fileData} = storeToRefs(sessionStore);

const editor = ref();
const manipulator = new ConfigManipulatorJson();

onMounted(() => {
  // Set up editor mode to JSON and define theme
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/json');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
    editorValueWasUpdatedFromOutside(sessionStore.fileData, sessionStore.currentPath);

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on('change', () => {
    try {
        sessionStore.$patch( { fileData: JSON.parse(editor.value.getValue()),
            lastChangeResponsible: ChangeResponsible.GuiEditor})
    } catch (e) {
      /* empty */
    }
  });
  editor.value.on('changeSelection', () => {
    try {
      let newPath = determinePath(editor.value.getValue(), editor.value.getCursorPosition());
      sessionStore.$patch( { currentSelectedElement: newPath, lastChangeResponsible: ChangeResponsible.GuiEditor });
    } catch (e) {
      /* empty */
    }
  });

  // Listen to changes in store and update content accordingly
  watch(
    fileData,
    newVal => {
        if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
            editorValueWasUpdatedFromOutside(newVal, sessionStore.currentPath);
        }
    },
    {deep: true}
  );
  // Listen to changes in current path and update cursor accordingly
  watch(
    currentPath,
    newVal => {
      if (editor.value) {
          if (sessionStore.lastChangeResponsible != ChangeResponsible.CodeEditor) {
              updateCursorPositionBasedOnPath(newVal, sessionStore.currentPath);
          }
      }
    },
    {deep: true}
  );
});

function editorValueWasUpdatedFromOutside(configData, currentPath: Path) {
    // Update value with new data and also update cursor position
    const newEditorContent = JSON.stringify(configData, null, 2);
    editor.value.setValue(newEditorContent);
    updateCursorPositionBasedOnPath(configData, currentPath);
}

function updateCursorPositionBasedOnPath(configData, currentPath: Path) {
  let position = determineCursorPosition(configData, currentPath);
  editor.value.gotoLine(position.row);
}

function determineCursorPosition(editorContent: string, currentPath: Path): Position {
    console.log("determine cursor position", editorContent)
    let x = manipulator.determinePath(editorContent, 4);
    console.log("determine cursor position 2")
  //let index =  manipulator.determineCursorPosition(editorContent, currentPath);
 // console.log("got index "+ index);
  //return editor.value.session.doc.indexToPosition(index, 0);
    return {
        row: 0,
        column: 0
    }
}

function determinePath(editorContent: string, cursorPosition: Position): Path {
  let targetCharacter = editor.value.session.doc.positionToIndex(cursorPosition, 0);
    console.log("determine path position", editorContent)
  return manipulator.determinePath(editorContent, targetCharacter);
  // TODO: determines path. but missing is that we don't go into simple properties. Only into objects and arrays
  // so to do: compare result path with schema and cut off last path array element if it is not complex
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
