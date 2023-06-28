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

import {useDataStore} from '@/store/dataStore';
import type {Path} from '@/model/path';
import {useCommonStore} from '@/store/commonStore';
import {ConfigManipulatorJson} from '@/helpers/ConfigManipulatorJson';
import type {Position} from 'brace';

const {currentPath} = storeToRefs(useCommonStore());
const {configData} = storeToRefs(useDataStore());
const commonStore = useCommonStore();
const editor = ref();
const manipulator = new ConfigManipulatorJson();

onMounted(() => {
  // Set up editor mode to JSON and define theme
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/json');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  updateEditorValue(configData.value, currentPath.value);

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on('change', () => {
    try {
      configData.value = JSON.parse(editor.value.getValue());
    } catch (e) {
      /* empty */
    }
  });
  editor.value.on('changeSelection', () => {
    try {
      let newPath = determinePath(editor.value.getValue(), editor.value.getCursorPosition());
      commonStore.$patch({currentPath: newPath});
    } catch (e) {
      /* empty */
    }
  });

  // Listen to changes in store and update content accordingly
  watch(
    configData,
    newVal => {
      updateEditorValue(newVal, currentPath.value);
    },
    {deep: true}
  );
  // Listen to changes in current path and update cursor accordingly
  watch(
    currentPath,
    newVal => {
      if (editor.value) {
        updateCursorPositionBasedOnPath(newVal, currentPath.value);
      }
    },
    {deep: true}
  );
});

function updateEditorValue(configData, currentPath: Path) {
  const currEditorConfigObject =
    editor.value.getValue() != '' ? JSON.parse(editor.value.getValue()) : {};
  if (!_.isEqual(currEditorConfigObject, configData)) {
    // Update value with new data and also update cursor position
    const newEditorContent = JSON.stringify(configData, null, 2);
    editor.value.setValue(newEditorContent);
    updateCursorPositionBasedOnPath(configData, currentPath);
  }
}

function updateCursorPositionBasedOnPath(configData, currentPath: Path) {
  let position = determineCursorPosition(configData, currentPath);
  //editor.value.gotoLine(position.row);
}

function determineCursorPosition(editorContent: string, currentPath: Path): Position {
  return manipulator.determineCursorPosition(editorContent, currentPath);
}

function determinePath(editorContent: string, cursorPosition: Position): Path {
  let targetCharacter = editor.value.session.doc.positionToIndex(cursorPosition, 0);
  return manipulator.determinePath(editorContent, targetCharacter);
  // TODO: determines path. but missing is that we don't go into simple properties. Only into objects and arrays
  // so to do: compare result path with schema and cut off last path array element if it is not complex
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
