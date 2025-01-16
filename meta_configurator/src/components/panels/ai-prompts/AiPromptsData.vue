<script setup lang="ts">
import AiPromptsTemplate from '@/components/panels/ai-prompts/AiPromptsTemplate.vue';
import {queryDataConversion, queryDataModification} from '@/utility/openai';
import {SessionMode} from '@/store/sessionMode';

function queryDocumentCreation(apiKey: string, prompt: string, schema: string): Promise<string> {
  return queryDataConversion(apiKey, prompt, schema);
}

function queryDocumentModification(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return queryDataModification(apiKey, prompt, currentData, schema);
}
</script>

<template>
  <AiPromptsTemplate
    :session-mode="SessionMode.DataEditor"
    default-text-create-document="Enter or describe your Data in any format"
    default-text-modify-document="How do you want your Data to be modified?"
    label-document-type="Data"
    label-modify-info="When the complete document is selected for modification, the complete document will be processed by the AI to apply the modification. If you want a modification only for a specific entity or attribute, selecting that element will help reduce the processing time for the modification and increase the quality of the result. Especially for large documents, it is not recommended to use the complete document for generating modifications."
    :function-query-document-creation="queryDocumentCreation"
    :function-query-document-modification="queryDocumentModification" />
</template>

<style scoped></style>
