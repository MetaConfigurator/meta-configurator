<script setup lang="ts">
import AiPromptsTemplate from '@/components/panels/ai-prompts/AiPromptsTemplate.vue';
import {
  queryDataConversionFromJson,
  querySchemaCreation,
  querySchemaModification,
  querySchemaQuestion,
} from '@/utility/ai/aiEndpoint';
import {SessionMode} from '@/store/sessionMode';

const props = defineProps<{
  sessionMode: SessionMode;
}>();

function queryDocumentCreation(apiKey: string, prompt: string, schema: string): Promise<string> {
  return querySchemaCreation(apiKey, prompt);
}

function queryDocumentModification(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return querySchemaModification(apiKey, prompt, currentData);
}

function queryDocumentQuestion(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return querySchemaQuestion(apiKey, prompt, currentData);
}

function queryDocumentExport(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return queryDataConversionFromJson(apiKey, prompt, currentData, schema);
}
</script>

<template>
  <AiPromptsTemplate
    :session-mode="props.sessionMode"
    default-text-create-document="Enter your Schema description"
    default-text-modify-document="How do you want your Schema to be modified?"
    default-text-question-document="Ask a question about your Schema"
    default-text-export-document="Enter an example file of your desired output Data Format or describe the Format."
    label-document-type="Schema"
    label-modify-info="When the complete schema is selected for modification, the complete schema will be processed by the AI to apply the modification. If you want a modification only for a specific class or attribute type, selecting that element will help reduce the processing time for the modification and increase the quality of the result. Especially for large schemas, it is not recommended to use the complete schema document for generating modifications."
    :function-query-document-creation="queryDocumentCreation"
    :function-query-document-modification="queryDocumentModification"
    :function-query-document-question="queryDocumentQuestion"
    :function-query-document-export="queryDocumentExport" />
</template>

<style scoped></style>
