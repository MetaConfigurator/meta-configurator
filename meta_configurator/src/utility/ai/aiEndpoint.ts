import axios from 'axios';
import {useSettings} from '@/settings/useSettings';

const BASE_URL = 'https://api.openai.com/v1';

export const queryOpenAI = async (
  apiKey: string,
  messages: {role: 'system' | 'user'; content: string}[],
  model: string | undefined = undefined,
  max_tokens: number | undefined = undefined,
  temperature: number | undefined = undefined,
  endpoint: string | undefined = undefined
) => {
  const settings = useSettings().value.aiIntegration;
  if (!model) model = settings.model;
  if (!max_tokens) max_tokens = settings.maxTokens;
  if (!temperature) temperature = settings.temperature;
  if (!endpoint) endpoint = settings.endpoint;

  if (!endpoint.startsWith('https://')) {
    endpoint = `${BASE_URL}/${endpoint}`;
  }
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}chat/completions`;
  }

  try {
    console.log('Querying OpenAI with messages: ', ...messages);
    const response = await axios.post(
      endpoint,
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
  const systemMessage = `You are a JSON schema expert. Create a JSON schema based on the schema description by the user. Return no other text than a fully valid JSON schema document. When appropriate, put sub-schema definitions into the $defs section. `;
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
  const systemMessage = `You are a JSON schema expert. Modify the provided JSON schema based on the schema change description by the user. Return no other text than a fully valid JSON schema document. No other explanation or words. When appropriate, put sub-schema definitions into the $defs section. The schema to modify is: \`\`\`${fullSchema}\`\`\``;
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
  const systemMessage = `You are a JSON schema expert. Explain/summarize/query the provided JSON schema based on the prompt by the user. The schema to query is: \`\`\`${fullSchema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
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
  const systemMessage = `You are a JSON schema expert. Convert the data input provided by the user (in any format) into a JSON document which satisfies the following schema: \`\`\`${schema}\`\`\`. Return no other text than a fully valid JSON document satisfying the schema. No other explanation or words.`;
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
  const systemMessage = `You are a JSON schema expert. Convert the JSON document \`\`\`${jsonData}\`\`\` into the format provided by the user. The user will provide a format description or an example file with different data of the target format. The JSON document follows the schema \`\`\`${schema}\`\`\`. Return no other text than a document matching the user provided example or description. No other explanation or words.`;
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
  const systemMessage = `You are a JSON schema expert. Modify the provided JSON document based on the data change description by the user. Return no other text than a fully valid JSON document. The document to modify is: \`\`\`${data}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${schema}\`\`\``;
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
  const systemMessage = `You are a JSON schema expert. Explain/summarize/query the provided JSON document based on the prompt by the user. The document to query is: \`\`\`${data}\`\`\`. The JSON schema for the document is \`\`\`${schema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
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
  const systemMessage = `You are a JSON schema expert. Modify the provided settings based on the settings change description by the user. Return no other text than a fully valid JSON document. The settings to modify are: \`\`\`${currentSettings}\`\`\`. The resulting JSON document needs to satisfy the JSON schema \`\`\`${settingsSchema}\`\`\``;
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
  const systemMessage = `You are a JSON schema expert. Explain/summarize/query the user settings of the MetaConfigurator web app based on the prompt by the user. The settings to query is: \`\`\`${data}\`\`\`. The JSON schema for the settings is \`\`\`${schema}\`\`\`. Use normal natural language sentences for the responses but avoid special formatting. Keep the response short and concise.`;
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: settingsQuestionNaturalLanguage},
  ]);
};

export const queryDataMappingConfig = async (
  apiKey: string,
  dataMappingConfigSchema: string,
  dataMappingConfigExample: string,
  inputFileSchema: string,
  targetSchema: string,
  inputFileSubset: string,
  possibleSourcePaths: string[],
  userComments: string
) => {
  const systemMessage = `You are a JSON expert. Your task is to generate a data mapping configuration JSON document.

This document must be a valid *instance* that follows the schema defined by \`\`\`${dataMappingConfigSchema}\`\`\`.

You must NOT output a JSON Schema or include any \`$schema\`, \`type\`, \`properties\`, or similar schema-related keywords. 
The result must only be a concrete instance, like the following example: \`\`\`${dataMappingConfigExample}\`\`\`.

The configuration maps data from an input file (with known schema and example subset) to match the structure of a target schema.

Return ONLY a valid JSON object (no surrounding text or explanation).`;

  let userMessage = `The input file follows this schema: \`\`\`${inputFileSchema}\`\`\`.  
The goal is to map it to match this target schema: \`\`\`${targetSchema}\`\`\`.  
To help with the mapping, here is a subset of the input file: \`\`\`${inputFileSubset}\`\`\`.
Here is a list of possible source paths to use in the mapping config: \`\`\`${possibleSourcePaths.join(
    ', '
  )}\`\`\``;

  if (userComments && userComments.length > 0) {
    userMessage += `  
User comments for clarification: \`\`\`${userComments}\`\`\``;
  }
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};

export const queryJsonataExpression = async (
  apiKey: string,
  jsonataReferenceGuide: string,
  exampleInput: string,
  exampleInputSchema: string,
  exampleOutput: string,
  exampleOutputSchema: string,
  exampleExpression: string,
  inputFileSubset: string,
  inputFileSchema: string,
  targetSchema: string,
  userComments: string
) => {
  const systemMessage = `You are a JSON and JSONata Data Mapping expert. Your task is to generate a JSONata expression for transforming the user input document to satisfy the given output JSON schema.
  Only output **valid JSONata**, which is a single JSON-like expression. Do not use multi-line functions, JavaScript-style blocks, or function declarations like "function($x) {...}". JSONata only supports inline expressions, conditionals, filters, maps, and built-in functions.
  Remember: JSONata is a declarative query and transformation language with syntax similar to JSON. It does **not** support full function declarations. Transformations must be inline.
  \`\`\`${jsonataReferenceGuide}\`\`\`
  Example input file: \`\`\`${exampleInput}\`\`\`.
  Example input schema: \`\`\`${exampleInputSchema}\`\`\`.
  Example output schema: \`\`\`${exampleOutputSchema}\`\`\`.
  For these examples you should generate the following JSONata expression: \`\`\`${exampleExpression}\`\`\`.
  The expression would transform the input file to the following output file (as intended): \`\`\`${exampleOutput}\`\`\`.
  The JSONata expression/transformation maps data from an input file (with known schema and example subset) to match the structure of a target schema.
  Return ONLY a valid JSONata expression (no surrounding text or explanation).`;

  let userMessage = `Real input file subset: \`\`\`${inputFileSubset}\`\`\`.  
  Input file schema: \`\`\`${inputFileSchema}\`\`\`.
  The goal is to generate an expression to make JSONata transform the input to satisfy this output schema: \`\`\`${targetSchema}\`\`\`. Keep it simple and conservative. Avoid adding new values that do not exist or using overly complex JSONata features.
  Return a prettified, multi-line JSONata expression, with no extra text or explanation.`;

  if (userComments && userComments.length > 0) {
    userMessage += `  
User comments for clarification: \`\`\`${userComments}\`\`\``;
  }
  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};

export const queryHandlebarsTemplate = async (
  apiKey: string,
  exampleInput: string,
  exampleInputSchema: string,
  exampleOutput: string,
  exampleExpression: string,
  inputFileSubset: string,
  inputFileSchema: string,
  outputDescription: string
) => {
  const systemMessage = `You are a JSON and Handlebars Text Templating expert. Your task is to generate a Handlebars Template for transforming the user input JSON document to a text document as desired by the user.
  Only output **valid Handlebars** template syntax. Do not use any other templating language or surrounding text.
  Example input file: \`\`\`${exampleInput}\`\`\`.
  Example input schema: \`\`\`${exampleInputSchema}\`\`\`.
  Example output: \`\`\`${exampleOutput}\`\`\`.
  For these examples you should generate the following Template: \`\`\`${exampleExpression}\`\`\`.
  The output description can also be natural language texts or other data structures (e.g., XML, or other formats), but the output must always be a text document.`;

  let userMessage = `Input file subset: \`\`\`${inputFileSubset}\`\`\`.  
  Input file schema: \`\`\`${inputFileSchema}\`\`\`.
  The goal is to generate a handlebars Template. Description or example of the desired output document: \`\`\`${outputDescription}\`\`\`. Keep it simple and conservative. Avoid adding new values that do not exist.`;

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};
