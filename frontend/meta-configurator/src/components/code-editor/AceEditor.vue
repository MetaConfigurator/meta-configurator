<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {useDataStore} from '@/store/dataStore';
import {storeToRefs} from 'pinia';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import type {Path} from '@/model/path';
import {useCommonStore} from '@/store/commonStore';
import {ConfigManipulatorJson} from "@/helpers/ConfigManipulatorJson";
import type {Position} from "brace";

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
      if (editor.value) {
        updateEditorValue(newVal, currentPath.value);
      }
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
  const currEditorContent = editor.value.getValue();
  const newEditorContent = JSON.stringify(configData, null, 2);
  if (currEditorContent !== newEditorContent) {
    // Update value with new data and also update cursor position
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
    return manipulator.determinePath(editorContent, cursorPosition);
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
