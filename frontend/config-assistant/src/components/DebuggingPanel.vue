<script setup lang="ts">
import {computed} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';
import {debuggingService} from '@/helpers/debuggingService';
import {watchArray} from '@vueuse/core';

const store = useSessionStore();

const fileData = computed(() => getFileData());
const schemaContent = computed(() => getSchema());
const schemaContentDataStore = computed(() => getSchemaDataStore());
const dataAtCurrentPathContent = computed(() => getDataAtCurrentPath());

function getFileData() {
  return JSON.stringify(store.fileData);
}

function getSchema() {
  return JSON.stringify(store.fileSchema);
}
function getSchemaDataStore() {
  return JSON.stringify(useDataStore().schemaData);
}
function getDataAtCurrentPath() {
  return JSON.stringify(store.dataAtCurrentPath);
}

function printPreprocessingSteps() {
  let currentDepth = -1;
  debuggingService.preprocessingSteps.value.forEach(step => {
    if (step.depth > currentDepth) {
      console.groupCollapsed(step.depth);
      currentDepth = step.depth;
    } else if (step.depth < currentDepth) {
      console.groupEnd();
      currentDepth = step.depth;
    }
    console.log(step.stringRepresentation);
    console.log(step.schema);
  });
  for (let i = 0; i <= currentDepth; i++) {
    console.groupEnd();
  }
}

watchArray(debuggingService.preprocessingSteps, () => {
  console.log('preprocessingSteps changed');
  printPreprocessingSteps();
});
</script>

<template>
  <div><b>currentMode:</b> {{ store.currentMode }}</div>
  <div><b>lastChangeResponsible:</b> {{ store.lastChangeResponsible }}</div>
  <div><b>fileData</b></div>
  <textarea class="bg-amber-300" v-model="fileData" />
  <div><b>schemaContent</b></div>
  <textarea class="bg-cyan-200" v-model="schemaContent" />
  <div><b>dataAtCurrentPath</b></div>
  <textarea class="bg-green-300" v-model="dataAtCurrentPathContent" />
  <div><b>schemaContentDataStore</b></div>
  <textarea class="bg-gradient-to-r from-purple-100 to-red-200" v-model="schemaContentDataStore" />

  <div><b>preprocessingSteps</b></div>
  <button
    @click="
      () => {
        debuggingService.resetPreprocessingSteps();
      }
    "
    class="bg-blue-200">
    reset
  </button>
  <br />
  <button
    @click="
      () => {
        printPreprocessingSteps();
      }
    "
    class="bg-blue-200">
    log
  </button>
</template>

<style scoped></style>
