<!--
Component for displaying the OpenAI API key input.
-->
<script setup lang="ts">
import {type Ref, ref} from 'vue';
import Password from 'primevue/password';
import SelectButton from 'primevue/selectbutton';
import {getApiKeyRef, getRememberInTabRef} from '@/utility/ai/apiKey';

const apiKey: Ref<string> = getApiKeyRef();
const rememberInTab: Ref<boolean> = getRememberInTabRef();

const rememberOptions = ref([
  {name: 'Remember in this tab', value: true},
  {name: 'Forget on refresh', value: false},
]);
</script>

<template>
  MetaConfigurator supports any LLM provider that implements the OpenAI API — including OpenAI,
  Perplexity, OpenRouter, Helmholtz Blablador, Academic Cloud, and others. Switch between providers
  by changing the endpoint and model in the settings.
  <br />
  <br />
  To use a provider directly from the browser, enter your API key below. The key is stored only in
  your browser and sent directly to the provider — it is never sent to MetaConfigurator servers.
  However, storing API keys in the browser carries risk: any script running on the page can
  potentially read them, and keys may be exposed in browser history or developer tools.
  <br />
  <br />
  For better security, consider using the
  <a href="https://github.com/MetaConfigurator/meta-configurator/tree/main/relay" target="_blank"
    >MetaConfigurator Relay</a
  >: a lightweight self-hosted proxy that holds your provider API key server-side. When a relay is
  configured, no key needs to be entered here.
  <span class="api-key-container">
    <span>Key:</span>
    <Password v-model="apiKey" placeholder="Enter your API Key" :feedback="false" />
    <SelectButton
      v-model="rememberInTab"
      :options="rememberOptions"
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
