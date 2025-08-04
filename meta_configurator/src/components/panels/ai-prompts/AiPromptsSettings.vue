<script setup lang="ts">
import AiPromptsTemplate from '@/components/panels/ai-prompts/AiPromptsTemplate.vue';
import {querySettingsModification, querySettingsQuestion} from '@/utility/ai/aiEndpoint';
import {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

function queryDocumentModification(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return querySettingsModification(apiKey, prompt, currentData, schema);
}

function queryDocumentQuestion(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return querySettingsQuestion(apiKey, prompt, currentData, schema);
}
</script>

<template>
  <AiPromptsTemplate
    :session-mode="props.sessionMode"
    default-text-create-document=""
    default-text-modify-document="How do you want your Settings to be modified?"
    default-text-question-document="Ask a question about your Settings"
    default-text-export-document=""
    label-document-type="Settings"
    :label-modify-info="undefined"
    :function-query-document-creation="undefined"
    :function-query-document-modification="queryDocumentModification"
    :function-query-document-question="queryDocumentQuestion"
    :function-query-document-export="undefined" />
</template>

<style scoped></style>
