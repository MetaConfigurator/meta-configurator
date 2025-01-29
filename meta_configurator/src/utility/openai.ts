import axios from 'axios';
import {useSettings} from '@/settings/useSettings';
import type {JsonSchemaType} from "@/schema/jsonSchemaType";

const BASE_URL = 'https://api.openai.com/v1';

export const queryOpenAI = async (
  apiKey: string,
  messages: {role: 'system' | 'user'; content: string}[],
  model: string | undefined = undefined,
  max_tokens: number | undefined = undefined,
  temperature: number | undefined = undefined,
  endpoint: string | undefined = undefined
) => {
  const settings = useSettings().value.openAi;
  if (!model) model = settings.model;
  if (!max_tokens) max_tokens = settings.maxTokens;
  if (!temperature) temperature = settings.temperature;
  if (!endpoint) endpoint = settings.endpoint;

  try {
    console.log('Querying OpenAI with messages: ', ...messages);
    const response = await axios.post(
      `${BASE_URL}/${endpoint}`,
      {
        model,
        messages,
        max_tokens: max_tokens,
        temperature: temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const resultSchema: string = response.data.choices[0].message.content;
    console.log('Result schema from AI prompt:', resultSchema, 'based on messages:', messages);
    return resultSchema;
  } catch (error) {
    console.error('Error querying OpenAI:', error);
    throw error;
  }
};

export const querySchemaCreation = async (
  apiKey: string,
  schemaDescriptionNaturalLanguage: string
) => {
  const systemMessage = `Create a JSON schema based on the schema description by the user. Return no other text than a fully valid JSON schema document.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: schemaDescriptionNaturalLanguage},
  ]);
};

export const querySchemaModification = async (
  apiKey: string,
  schemaChangeDescriptionNaturalLanguage: string,
  fullSchema: string
) => {
  const systemMessage = `Modify the provided JSON schema based on the schema change description by the user. Return no other text than a fully valid JSON schema document. No other explanation or words. The schema to modify is: \`\`\`${fullSchema}\`\`\``;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: schemaChangeDescriptionNaturalLanguage},
  ]);
};

export const querySchemaQuestion = async (
  apiKey: string,
  schemaQueryNaturalLanguage: string,
  fullSchema: string
) => {
  const systemMessage = `Explain/summarize/query the provided JSON schema based on the prompt by the user. The schema to query is: \`\`\`${fullSchema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: schemaQueryNaturalLanguage},
  ]);
};

export const queryDataConversionToJson = async (
  apiKey: string,
  dataInOtherFormat: string,
  schema: string
) => {
  const systemMessage = `Convert the data input provided by the user (in any format) into a JSON document which satisfies the following schema: \`\`\`${schema}\`\`\`. Return no other text than a fully valid JSON document satisfying the schema. No other explanation or words.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: dataInOtherFormat},
  ]);
};

export const queryDataConversionFromJson = async (
  apiKey: string,
  descriptionOrDataInOtherFormat: string,
  jsonData: string,
  schema: string
) => {
  const systemMessage = `Convert the JSON document \`\`\`${jsonData}\`\`\` into the format provided by the user. The user will provide a format description or an example file with different data of the target format. The JSON document follows the schema \`\`\`${schema}\`\`\`. Return no other text than a document matching the user provided example or description. No other explanation or words.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: descriptionOrDataInOtherFormat},
  ]);
};

export const queryDataModification = async (
  apiKey: string,
  dataChangeDescriptionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  const systemMessage = `Modify the provided JSON document based on the data change description by the user. Return no other text than a fully valid JSON document. The document to modify is: \`\`\`${data}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${schema}\`\`\``;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: dataChangeDescriptionNaturalLanguage},
  ]);
};

export const queryDataQuestion = async (
  apiKey: string,
  dataQuestionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  const systemMessage = `Explain/summarize/query the provided JSON document based on the prompt by the user. The document to query is: ${data}. The JSON schema for the document is ${schema}. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: dataQuestionNaturalLanguage},
  ]);
};

export const querySettingsModification = async (
  apiKey: string,
  settingsChangeDescriptionNaturalLanguage: string,
  currentSettings: string,
  settingsSchema: string
) => {
  const systemMessage = `Modify the provided settings based on the settings change description by the user. Return no other text than a fully valid JSON document. The settings to modify are: ${currentSettings}. The resulting JSON document needs to satisfy the JSON schema ${settingsSchema}`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: settingsChangeDescriptionNaturalLanguage},
  ]);
};

export const querySettingsQuestion = async (
  apiKey: string,
  settingsQuestionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  const systemMessage = `Explain/summarize/query the user settings of the MetaConfigurator web app based on the prompt by the user. The settings to query is: ${data}. The JSON schema for the settings is ${schema}. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: settingsQuestionNaturalLanguage},
  ]);
  
};
