<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {dataStore} from '@/stores/dataStore';
import {storeToRefs} from 'pinia';
import * as ace from 'brace';
import 'brace/mode/javascript';
import 'brace/mode/json';
import 'brace/theme/clouds';
import 'brace/theme/ambiance';
import 'brace/theme/monokai';

import {edit} from 'brace';

const store = dataStore();
const {configData} = storeToRefs(store);
const editorValue = ref('');
const editor = ref();

const textContent = computed({
  get: () => configToYamlString(),
  set: (value: string) => userUpdatedText(value),
});

function configToYamlString() {
  return JSON.stringify(configData.value);
}

function userUpdatedText(text: string) {
  store.configData = JSON.parse(text);
}

onMounted(() => {
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/json');
  editor.value.setTheme('ace/theme/clouds');

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
        }
      }
    },
    {deep: true}
  );
  editor.value.clearSelection();
});
</script>

<template>
  <div id="javascript-editor"></div>
  <textarea v-model="textContent" id="javascript-editor" class="bg-amber-300 h-screen"> </textarea>
</template>

<style scoped>
#javascript-editor {
  width: 600px;
  height: 735px;
}
</style>
