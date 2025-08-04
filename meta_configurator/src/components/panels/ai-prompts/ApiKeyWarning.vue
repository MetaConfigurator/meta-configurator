<!--
Component for displaying an API key warning if no API key is provided.
-->
<script setup lang="ts">
import {type Ref} from 'vue';
import Message from 'primevue/message';
import {getApiKeyRef} from '@/utility/ai/apiKey';

const apiKey: Ref<string> = getApiKeyRef();
</script>

<template>
  <Message severity="warn" v-if="apiKey.length <= 1"
    >Please enter your API key in the AI Prompts Settings options above (click to expand).</Message
  >
</template>

<style scoped></style>
