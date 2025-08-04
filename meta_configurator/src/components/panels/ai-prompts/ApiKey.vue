<!--
Component for displaying the OpenAI API key input.
-->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Password from 'primevue/password';
import SelectButton from 'primevue/selectbutton';
import {getApiKeyRef, getIsPersistKeyRef} from '@/utility/ai/apiKey';

const isShowPersistOption = false; // currently the option of whether to persist the key is not shown because without persistence the key currently can not be accessed

const apiKey: Ref<string> = getApiKeyRef();
const isPersistKey: Ref<boolean> = getIsPersistKeyRef();

const persistOptions = ref([
  {name: 'true', value: true},
  {name: 'false', value: false},
]);
</script>

<template>
  MetaConfigurator supports the OpenAI API (including other AI endpoints using the same API). Define
  your endpoint in the settings.
  <br />
  For OpenAI, generate your API Key
  <a href="https://platform.openai.com/account/api-keys" target="_blank">here</a>. Usage of the
  OpenAI API normally requires balance on the OpenAI account. One-time purchase of balance is
  possible without permanently connecting your credit card with your account. Check this
  <a href="https://platform.openai.com/docs/pricing" target="_blank">link</a> for pricing.
  <br />
  <br />
  MetaConfigurator by default uses the gpt-4o-mini model, which has very low cost. For improved
  results you can change to more performant models in the settings tab.
  <span class="api-key-container">
    <span>Key:</span>
    <Password v-model="apiKey" placeholder="Enter your OpenAI API Key" :feedback="false" />
    <span v-show="isShowPersistOption">Persist:</span>
    <SelectButton
      v-show="isShowPersistOption"
      v-model="isPersistKey"
      :options="persistOptions"
      option-label="name"
      option-value="value" />
  </span>
</template>

<style scoped>
.api-key-container {
  display: flex;
  align-items: center;
}
.api-key-container > * {
  margin-right: 8px;
}

a {
  text-decoration: none;
  color: var(--p-primary-500);
}
</style>
