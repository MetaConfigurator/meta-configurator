<!--
Component for displaying the current path in the GUI editor
and allowing the user to jump to a parent path.
-->
<script setup lang="ts">
import {onMounted, type Ref, ref, watch} from 'vue';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import Panel from "primevue/panel";
import SelectButton from "primevue/selectbutton";


const apiKey: Ref<string> = ref('');
const isPersistKey: Ref<boolean> = ref(false);

onMounted(() => {
  const storedApiKey = localStorage.getItem('openai_api_key');
  if (storedApiKey) {
    apiKey.value = storedApiKey;
  }
  const storedPersistKey = localStorage.getItem('openai_persist_key');
  if (storedPersistKey) {
    isPersistKey.value = storedPersistKey === 'true';
  }
});


const persistOptions = ref([
  {name: 'true', value: true},
  {name: 'false', value: false},
]);


watch(apiKey, (newValue) => {
  if (isPersistKey.value) {
    localStorage.setItem('openai_api_key', newValue);
  }
});

watch(isPersistKey, (newValue) => {
  localStorage.setItem('openai_persist_key', newValue.toString());
  if (!newValue) {
    localStorage.removeItem('openai_api_key');
  }
});

</script>

<template>

  <Panel
      header="API Key"
      toggleable
      :collapsed="true">
  <span class="api-key-container">
    <span>Key:</span>
    <Password v-model="apiKey" placeholder="Enter your OpenAI API Key" :feedback="false"/>
    <span>Persist:</span>
    <SelectButton v-model="isPersistKey" :options="persistOptions" option-label="name" option-value="value"/>
  </span>
  </Panel>
</template>

<style scoped>

.api-key-container {
  display: flex;
  align-items: center;
}
.api-key-container > * {
  margin-right: 8px;
}
</style>
