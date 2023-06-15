<script setup lang="ts">
import {dataStore} from '@/stores/dataStore';
import {storeToRefs} from 'pinia';
import {computed} from 'vue';

const store = dataStore();

const {configData} = storeToRefs(store);

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
</script>

<template>
  <textarea v-model="textContent" class="bg-amber-300 h-screen"> </textarea>
</template>

<style scoped></style>
