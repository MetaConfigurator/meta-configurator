<script setup lang="ts">
import AiPromptsTemplate from "@/components/panels/ai-prompts/AiPromptsTemplate.vue";
import {
  querySchemaCreation,
  querySchemaModification
} from "@/utility/openai";
import {SessionMode} from "@/store/sessionMode";


function queryDocumentCreation(apiKey: string, prompt: string, schema: string): Promise<string> {
  return querySchemaCreation(apiKey, prompt);
}

function queryDocumentModification(apiKey: string, prompt: string, currentData: string, schema: string): Promise<string> {
  return querySchemaModification(apiKey, prompt, currentData);
}


</script>

<template>
  <AiPromptsTemplate
      :session-mode="SessionMode.SchemaEditor"
      default-text-create-document="Enter your Schema description"
      default-text-modify-document="How do you want your Schema to be modified?"
      label-document-type="Schema"
      label-modify-info="When the complete schema is selected for modification, the complete schema will be processed by the AI to apply the modification. If you want a modification only for a specific class or attribute type, selecting that element will help reduce the processing time for the modification and increase the quality of the result. Especially for large schemas, it is not recommended to use the complete schema document for generating modifications."
      :function-query-document-creation="queryDocumentCreation"
      :function-query-document-modification="queryDocumentModification"
  />
</template>

<style scoped></style>
