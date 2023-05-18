<script setup lang="ts">
import { dataStore } from '@/stores/dataStore';
import { ref, watch } from 'vue';
import YAML from 'yaml';

const store = dataStore();

store.$subscribe((mutation, state) => {
  textContent.value = getConfigText(state);
});

const textContent = ref(getConfigText(store));

watch(textContent, () => {
  // this callback is invoked when myRef changes
  userUpdatedText(textContent.value);
});

function getConfigText(state) {
  return YAML.stringify(state.configData);
}

function userUpdatedText(text) {
  store.configData = YAML.parse(text);
}
</script>

<template>
  <!--    <div class="greetings">
        <h1 class="green">{{ store.configData }}</h1>

    </div>-->

  <textarea v-model='textContent' class='bg-blue-500' v-on:change='userUpdatedText'> </textarea>
</template>

<style scoped></style>
