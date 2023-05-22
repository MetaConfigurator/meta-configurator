<script setup lang="ts">
import { dataStore } from '@/stores/dataStore';
import { computed } from 'vue';
import YAML from 'yaml';
import { storeToRefs } from 'pinia';

const store = dataStore();

const {configData} = storeToRefs(store);

const textContent = computed({
  get: () => configToYamlString(),
  set: (value: string) => userUpdatedText(value),
});

function configToYamlString() {
  return YAML.stringify(configData.value);
}

function userUpdatedText(text: string) {
  store.configData = YAML.parse(text);
}
</script>

<template>
  <textarea v-model="textContent" class="bg-blue-500"> </textarea>
</template>

<style scoped></style>
