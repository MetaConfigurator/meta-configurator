<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {dataStore} from '@/store/dataStore';
import {storeToRefs} from 'pinia';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/yaml';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';
import YAML from 'yaml';

const store = dataStore();
const {configData, currentPath} = storeToRefs(store);
const editor = ref();

onMounted(() => {
  // Set up editor mode to JSON and define theme
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/yaml');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  updateEditorValue(store.configData, store.currentPath);

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on('change', () => {
    try {
      store.configData = YAML.parse(editor.value.getValue());
    } catch (e) {
      /* empty */
    }
  });

  // Listen to changes in store and update content accordingly
  watch(
    configData,
    newVal => {
      if (editor.value) {
        updateEditorValue(newVal, store.currentPath);
      }
    },
    {deep: true}
  );
  // Listen to changes in current path and update cursor accordingly
  watch(
    currentPath,
    newVal => {
      if (editor.value) {
        updateSelectedPath(newVal, store.currentPath);
      }
    },
    {deep: true}
  );
});

function updateEditorValue(configData, currentPath: (string | number)[]) {
  const currEditorContent = editor.value.getValue();
  const newEditorContent = YAML.stringify(configData, null, 2);
  if (currEditorContent !== newEditorContent) {
    // Update value with new data and also update cursor position
    editor.value.setValue(newEditorContent);
    updateSelectedPath(configData, currentPath);
  }
}

function updateSelectedPath(configData, currentPath: (string | number)[]) {
  let line = determineCursorLine(configData, currentPath);
  editor.value.gotoLine(line);
}

function determineCursorLine(configData, currentPath: (string | number)[]): number {
  // todo: implement
  return 3;
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
