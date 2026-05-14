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
  MetaConfigurator works with any LLM provider that follows the OpenAI API format, including OpenAI,
  Perplexity, OpenRouter, Groq, Mistral, DeepSeek, and others. You can configure the connection
  method and model in the settings below. There are three backend options:
  <br />
  <br />
  <strong>CORS Compatible Endpoint</strong>: the browser talks directly to the AI provider. Only a
  handful of public APIs (OpenAI and Perplexity) actually allow this. If you use this option, enter
  your API key below. The key stays in your browser and goes straight to the provider, not to any
  MetaConfigurator server. Keep in mind that storing API keys in the browser has some risk, since
  any script running on the page could potentially read them.
  <br />
  <br />
  <strong>HTTPS Relay</strong>: requests go through a self-hosted
  <a href="https://github.com/MetaConfigurator/meta-configurator/tree/main/relay" target="_blank"
    >MetaConfigurator Relay</a
  >
  over HTTPS. This is the right choice when MetaConfigurator is served over HTTPS, which is the case
  for the stable and experimental public releases. The relay keeps the provider API key on the
  server, so you do not need to enter anything here. Note that you cannot point this at an HTTP
  relay from an HTTPS page; browsers will block that due to mixed-content rules.
  <br />
  <br />
  <strong>HTTP Relay</strong>: the same idea as the HTTPS relay, but over plain HTTP. This only
  makes sense when you are running MetaConfigurator locally over HTTP, for example during
  development. It will not work when accessed from an HTTPS page for the same mixed-content reason.
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
