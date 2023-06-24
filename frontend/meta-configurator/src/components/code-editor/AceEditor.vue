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
const {configData} = storeToRefs(store);
const editor = ref();

onMounted(() => {
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/json');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  editor.value.setValue(JSON.stringify(store.configData, null, 2));
  // listen to changes on AceEditor
  editor.value.on('change', () => {
    try {
      store.configData = JSON.parse(editor.value.getValue());
    } catch (e) {
      /* empty */
    }
  });
  // listen to changes on configData
  watch(
    configData,
    newVal => {
      if (editor.value) {
        const currEditorContent = editor.value.getValue();
        const newEditorContent = JSON.stringify(newVal, null, 2);

        if (currEditorContent !== newEditorContent) {
          editor.value.setValue(newEditorContent);

          editor.value.clearSelection();
        }
      }
    },
    {deep: true}
  );
  editor.value.clearSelection();
});
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
