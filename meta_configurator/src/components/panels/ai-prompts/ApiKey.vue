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
  method and model in the settings below.
  <br />
  <br />
  By default, MetaConfigurator uses the public <strong>Uni Stuttgart Relay</strong>, which forwards
  to <strong>Helmholtz Blablador</strong>. In that preset, no API key is needed in the browser.
  Availability is best-effort and cannot be guaranteed.
  <br />
  <br />
  In <strong>AI Endpoint Settings</strong>, you can also switch to:
  <br />
  <strong>Direct Endpoint</strong>: the browser talks directly to the provider. This only works if
  the provider allows browser CORS requests. Your API key stays in the browser.
  <br />
  <strong>HTTPS Relay</strong>: requests go through any
  <a
    href="https://github.com/MetaConfigurator/meta-configurator/tree/main/backend/relay"
    target="_blank"
    >MetaConfigurator Relay</a
  >
  over HTTPS, including a self-hosted one. The relay keeps the provider API key on the server, so
  you usually do not need to enter one here.
  <br />
  <strong>HTTP Relay</strong>: the same idea for local HTTP-only development. It will not work from
  an HTTPS MetaConfigurator page.
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
