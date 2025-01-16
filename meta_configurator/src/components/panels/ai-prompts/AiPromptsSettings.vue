<script setup lang="ts">
import AiPromptsTemplate from '@/components/panels/ai-prompts/AiPromptsTemplate.vue';
import {querySettingsModification} from '@/utility/openai';
import {SessionMode} from '@/store/sessionMode';

function queryDocumentModification(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return querySettingsModification(apiKey, prompt, currentData, schema);
}
</script>

<template>
  <AiPromptsTemplate
    :session-mode="SessionMode.Settings"
    default-text-create-document=""
    default-text-modify-document="How do you want your Settings to be modified?"
    label-document-type="Settings"
    :label-modify-info="undefined"
    :function-query-document-creation="undefined"
    :function-query-document-modification="queryDocumentModification" />
</template>

<style scoped></style>
