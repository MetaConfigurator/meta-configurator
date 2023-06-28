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
import YAML from 'yaml';

import {useDataStore} from '@/store/dataStore';
import type {Path} from '@/model/path';
import {useCommonStore} from '@/store/commonStore';

const {currentPath} = storeToRefs(useCommonStore());
const {configData} = storeToRefs(useDataStore());
const editor = ref();

onMounted(() => {
  // Set up editor mode to JSON and define theme
  editor.value = ace.edit('javascript-editor');
  editor.value.getSession().setMode('ace/mode/yaml');
  editor.value.setTheme('ace/theme/clouds');
  editor.value.setShowPrintMargin(false);

  // Feed config data from store into editor
  updateEditorValue(configData.value, currentPath.value);

  // Listen to changes on AceEditor and update store accordingly
  editor.value.on('change', () => {
    try {
      configData.value = YAML.parse(editor.value.getValue());
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
      updateSelectedPath(newVal, currentPath.value);
    },
    {deep: true}
  );
});

function updateEditorValue(configData, currentPath: Path) {
  const currEditorConfigObject =
    editor.value.getValue() != '' ? YAML.parse(editor.value.getValue()) : {};
  if (!_.isEqual(currEditorConfigObject, configData)) {
    // Update value with new data and also update cursor position
    const newEditorContent = YAML.stringify(configData, null, 2);
    editor.value.setValue(newEditorContent);
    updateSelectedPath(configData, currentPath);
  }
}

function updateSelectedPath(configData, currentPath: Path) {
  let line = determineCursorLine(configData, currentPath);
  editor.value.gotoLine(line);
}

function determineCursorLine(configData, currentPath: Path): number {
  // todo: implement
  return 3;
}
</script>

<template>
  <div class="h-full" id="javascript-editor"></div>
</template>

<style scoped></style>
