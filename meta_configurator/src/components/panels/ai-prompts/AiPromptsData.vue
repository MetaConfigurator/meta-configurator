<script setup lang="ts">
import AiPromptsTemplate from '@/components/panels/ai-prompts/AiPromptsTemplate.vue';
import {queryDataConversion, queryDataModification, queryDataQuestion} from '@/utility/openai';
import {SessionMode} from '@/store/sessionMode';
import {getDataForMode} from '@/data/useDataLink';
import _ from 'lodash';
import ApiKey from '@/components/panels/ai-prompts/ApiKey.vue';
import Divider from 'primevue/divider';

const props = defineProps<{
  sessionMode: SessionMode;
}>();


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

function queryDocumentQuestion(
  apiKey: string,
  prompt: string,
  currentData: string,
  schema: string
): Promise<string> {
  return queryDataQuestion(apiKey, prompt, currentData, schema);
}

function isSchemaEmpty() {
  return _.isEmpty(getDataForMode(SessionMode.SchemaEditor).data.value);
}
</script>

<template>
  <AiPromptsTemplate
    v-if="!isSchemaEmpty()"
    :session-mode="props.sessionMode"
    default-text-create-document="Enter or describe your Data in any format"
    default-text-modify-document="How do you want your Data to be modified?"
    default-text-question-document="Ask a question about your Data"
    label-document-type="Data"
    label-modify-info="When the complete document is selected for modification, the complete document will be processed by the AI to apply the modification. If you want a modification only for a specific entity or attribute, selecting that element will help reduce the processing time for the modification and increase the quality of the result. Especially for large documents, it is not recommended to use the complete document for generating modifications."
    :function-query-document-creation="queryDocumentCreation"
    :function-query-document-modification="queryDocumentModification"
    :function-query-document-question="queryDocumentQuestion" />
  <div v-else>
    <ApiKey class="api-key-top" />
    <Divider />

    <label class="heading">AI Prompts</label>
    <span>
      Before using the AI prompts to generate data, please create or select a schema in the Schema
      Editor tab.
    </span>
  </div>
</template>

<style scoped></style>

<style scoped>
.heading {
  font-size: 24px; /* Make the text bigger */
  font-weight: bold; /* Make the text bold */
  text-align: center; /* Center the text horizontally */
  display: block; /* Ensure the label behaves like a block element */
  margin-bottom: 10px; /* Add some space below the label */
}
.api-key-top {
  margin-bottom: auto;
}
</style>
