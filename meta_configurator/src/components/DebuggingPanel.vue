<!--
Panel for debugging purposes
-->
<script setup lang="ts">
import {computed} from 'vue';
import {useSessionStore} from '@/store/sessionStore';
import {useCurrentData, useCurrentSchema} from '@/data/useDataLink';

const store = useSessionStore();

const fileData = computed(() => getFileData());
const schemaContent = computed(() => getSchema());
const dataAtCurrentPathContent = computed(() => getDataAtCurrentPath());
function getFileData() {
  return useCurrentData().unparsedData.value;
}

function getSchema() {
  return JSON.stringify(useCurrentSchema().schemaWrapper.value);
}

function getDataAtCurrentPath() {
  return JSON.stringify(store.dataAtCurrentPath);
}
</script>

<template>
  <div><b>currentMode:</b> {{ store.currentMode }}</div>
  <div><b>currentPath:</b> {{ store.currentPath }}</div>
  <div><b>currentSelectedElement:</b> {{ store.currentSelectedElement }}</div>
  <div><b>fileData</b></div>
  <textarea class="bg-amber-300" v-model="fileData" />
  <div><b>schemaContent</b></div>
  <textarea class="bg-cyan-200" v-model="schemaContent" />
  <div><b>dataAtCurrentPath</b></div>
  <textarea class="bg-green-300" v-model="dataAtCurrentPathContent" />
</template>

<style scoped></style>
