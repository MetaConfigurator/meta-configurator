<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {dataStore} from '@/stores/dataStore';
import {storeToRefs} from 'pinia';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';

const store = dataStore();
const {configData, currentPath} = storeToRefs(store);
const editor = ref();

onMounted(() => {
  // Set up editor mode to JSON and define theme
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/json');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  editor.value.setValue(JSON.stringify(store.configData, null, 2));

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on('change', () => {
    try {
      store.configData = JSON.parse(editor.value.getValue());
    } catch (e) {
      /* empty */
    }
  });

  // Listen to changes in store and update content accordingly
  watch(
    configData,
    newVal => {
      if (editor.value) {
          updateEditorValue(newVal, store.currentPath)
      }
    },
    {deep: true}
  );
  editor.value.clearSelection();
});

function updateEditorValue(configData, currentPath: (string | number)[]) {
    const currEditorContent = editor.value.getValue();
    const newEditorContent = JSON.stringify(configData, null, 2);
    if (currEditorContent !== newEditorContent) {
        // Update value with new data and also update cursor position
        editor.value.setValue(newEditorContent, determineCursorPosition(configData, currentPath));
    }

}

function determineCursorPosition(configData, currentPath: (string | number)[]) {
    // todo
    return 1
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
