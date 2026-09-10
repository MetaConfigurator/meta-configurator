import axios from 'axios';
import {
  buildDataConversionFromJsonSystemMessage,
  buildDataConversionToJsonSystemMessage,
  buildDataModificationSystemMessage,
  buildDataQuestionSystemMessage,
  buildHandlebarsSystemMessage,
  buildHandlebarsUserMessage,
  buildRmlMappingSystemMessage,
  buildRmlMappingUserMessage,
  buildSchemaModificationSystemMessage,
  buildSchemaQuestionSystemMessage,
  buildSettingsModificationSystemMessage,
  buildSettingsQuestionSystemMessage,
  buildSparqlSystemMessage,
  buildSparqlUserMessage,
  SCHEMA_CREATION_SYSTEM_MESSAGE,
} from '@/utility/ai/aiPrompts';
import {useSettings} from '@/settings/useSettings';
import {throwAiRequestError} from '@/utility/ai/aiRequestError';

const BASE_URL = 'https://api.openai.com/v1';

const KNOWN_SETTINGS_FIELDS = new Set(['model', 'temperature', 'backend']);

export const queryOpenAI = async (
  apiKey: string,
  messages: {role: 'system' | 'user'; content: string}[],
  model: string | undefined = undefined,
  temperature: number | undefined = undefined,
  endpoint: string | undefined = undefined
) => {
  const settings = useSettings().value.aiIntegration;
  if (!model) model = settings.model;
  if (!temperature) temperature = settings.temperature;

  // Collect any extra model parameters the user added beyond the known fields
  const extraModelParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!KNOWN_SETTINGS_FIELDS.has(key)) {
      extraModelParams[key] = value;
    }
  }

  const backend = settings.backend;
  const extraHeaders: Record<string, string> = {};

  if ('relay' in backend) {
    // Route through the self-hosted relay.
    // Pass the configured upstream endpoint so the relay can forward there directly.
    endpoint = backend.relay.replace(/\/$/, '') + '/v1/chat/completions';
    if (backend.endpoint) {
      extraHeaders['X-Relay-Endpoint'] = backend.endpoint.trim();
    }
  } else {
    if (!endpoint) endpoint = backend.endpoint;
    if (!endpoint.startsWith('https://')) {
      endpoint = `${BASE_URL}/${endpoint}`;
    }
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = `${endpoint}chat/completions`;
    }
  }

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature,
    ...extraModelParams,
  };

  try {
    console.debug('Querying AI endpoint with messages: ', ...messages);
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    });
    const resultSchema: string = response.data.choices[0].message.content;
    console.debug('Result schema from AI prompt:', resultSchema, 'based on messages:', messages);
    return resultSchema;
  } catch (error: any) {
    console.error('Error querying AI endpoint:', error);
    throwAiRequestError(error, settings.backend);
  }
};

export const querySchemaCreation = async (
  apiKey: string,
  schemaDescriptionNaturalLanguage: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: SCHEMA_CREATION_SYSTEM_MESSAGE},
    {role: 'user', content: schemaDescriptionNaturalLanguage},
  ]);
};

export const querySchemaModification = async (
  apiKey: string,
  schemaChangeDescriptionNaturalLanguage: string,
  fullSchema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildSchemaModificationSystemMessage(fullSchema)},
    {role: 'user', content: schemaChangeDescriptionNaturalLanguage},
  ]);
};

export const querySchemaQuestion = async (
  apiKey: string,
  schemaQueryNaturalLanguage: string,
  fullSchema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildSchemaQuestionSystemMessage(fullSchema)},
    {role: 'user', content: schemaQueryNaturalLanguage},
  ]);
};

export const queryDataConversionToJson = async (
  apiKey: string,
  dataInOtherFormat: string,
  schema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildDataConversionToJsonSystemMessage(schema)},
    {role: 'user', content: dataInOtherFormat},
  ]);
};

export const queryDataConversionFromJson = async (
  apiKey: string,
  descriptionOrDataInOtherFormat: string,
  jsonData: string,
  schema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildDataConversionFromJsonSystemMessage(jsonData, schema)},
    {role: 'user', content: descriptionOrDataInOtherFormat},
  ]);
};

export const queryDataModification = async (
  apiKey: string,
  dataChangeDescriptionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildDataModificationSystemMessage(data, schema)},
    {role: 'user', content: dataChangeDescriptionNaturalLanguage},
  ]);
};

export const queryDataQuestion = async (
  apiKey: string,
  dataQuestionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildDataQuestionSystemMessage(data, schema)},
    {role: 'user', content: dataQuestionNaturalLanguage},
  ]);
};

export const querySettingsModification = async (
  apiKey: string,
  settingsChangeDescriptionNaturalLanguage: string,
  currentSettings: string,
  settingsSchema: string
) => {
  return queryOpenAI(apiKey, [
    {
      role: 'system',
      content: buildSettingsModificationSystemMessage(currentSettings, settingsSchema),
    },
    {role: 'user', content: settingsChangeDescriptionNaturalLanguage},
  ]);
};

export const querySettingsQuestion = async (
  apiKey: string,
  settingsQuestionNaturalLanguage: string,
  data: string,
  schema: string
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildSettingsQuestionSystemMessage(data, schema)},
    {role: 'user', content: settingsQuestionNaturalLanguage},
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
  return queryOpenAI(apiKey, [
    {
      role: 'system',
      content: buildHandlebarsSystemMessage(
        exampleInput,
        exampleInputSchema,
        exampleOutput,
        exampleExpression
      ),
    },
    {
      role: 'user',
      content: buildHandlebarsUserMessage(inputFileSubset, inputFileSchema, outputDescription),
    },
  ]);
};

export const queryRmlMapping = async (
  apiKey: string,
  instructions: string,
  exampleInput: string,
  exampleOutputRml: string,
  inputFileSubset: string,
  userComments: string
) => {
  return queryOpenAI(apiKey, [
    {
      role: 'system',
      content: buildRmlMappingSystemMessage(instructions, exampleInput, exampleOutputRml),
    },
    {role: 'user', content: buildRmlMappingUserMessage(inputFileSubset, userComments)},
  ]);
};

export const generateSparqlSuggestion = async (
  apiKey: string,
  jsonLdContent: string,
  userComments: string,
  prefixBlock: string,
  visualizationMode: boolean = false
) => {
  return queryOpenAI(apiKey, [
    {role: 'system', content: buildSparqlSystemMessage(visualizationMode)},
    {
      role: 'user',
      content: buildSparqlUserMessage(jsonLdContent, userComments, prefixBlock, visualizationMode),
    },
  ]);
};
