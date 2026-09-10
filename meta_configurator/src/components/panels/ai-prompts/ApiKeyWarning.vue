<!--
Component for displaying an API key warning if no API key is provided.
The warning is suppressed when endpointProxy is configured, because the relay
holds the provider key server-side and the API key field is optional in that case.
-->
<script setup lang="ts">
import {computed, type Ref} from 'vue';
import Message from 'primevue/message';
import {getApiKeyRef} from '@/utility/ai/apiKey';
import {canQueryAi} from '@/utility/ai/aiAvailability';

const apiKey: Ref<string> = getApiKeyRef();
const showWarning = computed(() => !canQueryAi(apiKey.value));
</script>

<template>
  <Message severity="warn" v-if="showWarning"
    >Please enter your API key in the AI Prompts Settings options above (click to expand).</Message
  >
</template>

<style scoped></style>
