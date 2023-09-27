<script setup lang="ts">
import {computed} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import {useDataStore} from '@/store/dataStore';

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
</script>

<template>
  <div><b>currentMode:</b> {{ store.currentMode }}</div>
  <div><b>lastChangeResponsible:</b> {{ store.lastChangeResponsible }}</div>
  <div><b>currentPath:</b> {{ store.currentPath }}</div>
  <div><b>currentSelectedElement:</b> {{ store.currentSelectedElement }}</div>
  <div><b>fileData</b></div>
  <textarea class="bg-amber-300" v-model="fileData" />
  <div><b>schemaContent</b></div>
  <textarea class="bg-cyan-200" v-model="schemaContent" />
  <div><b>dataAtCurrentPath</b></div>
  <textarea class="bg-green-300" v-model="dataAtCurrentPathContent" />
  <div><b>schemaContentDataStore</b></div>
  <textarea class="bg-gradient-to-r from-purple-100 to-red-200" v-model="schemaContentDataStore" />
</template>

<style scoped></style>
