import axios from 'axios';
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

export const queryRmlMapping = async (
  apiKey: string,
  instructions: string,
  exampleInput: string,
  exampleOutputRml: string,
  inputFileSubset: string,
  userComments: string
) => {
  const systemMessage = `
${instructions}

Example input JSON:
\`\`\`
${exampleInput}
\`\`\`

Example RML mapping:
\`\`\`
${exampleOutputRml}
\`\`\`
`;

  let userMessage = `
Real input JSON subset:
\`\`\`
${inputFileSubset}
\`\`\`

Requirements:
- Keep the mapping minimal and accurate.
- Only map fields that exist in the input JSON.
- Do not invent values or fields.

Return ONLY the RML mapping in valid Turtle syntax.
`;

  if (userComments && userComments.length > 0) {
    userMessage += `

Additional user comments:
\`\`\`
${userComments}
\`\`\`
`;
  }

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};

export const generateSparqlSuggestion = async (
  apiKey: string,
  jsonLdContent: string,
  userComments: string,
  prefixBlock: string,
  visualizationMode: boolean = false
) => {
  const baseSystemMessage = `
You are a SPARQL expert assistant.

Goal:
Generate a VALID SPARQL query for a JSON-LD/RDF dataset based on the user's intent.

General rules:
1) Do NOT invent prefixes. Use only the provided PREFIX block.
2) Prefer patterns that exist in the input graph.
3) If the user's request is ambiguous, make a sensible assumption and keep the query broad but safe.
4) Do NOT output any explanation. Output ONLY the VALID SPARQL query text.
`.trim();

  const visualizationSystemRules = `
Additional mandatory rules:
- Output MUST be a SPARQL CONSTRUCT query.
- The CONSTRUCT template MUST be EXACTLY:
  CONSTRUCT { ?subject ?predicate ?object . }
  Other construct patterns are NOT allowed.
  DO NOT CHANGE the CONSTRUCT template. Use BIND in the WHERE clause to define ?subject, ?predicate, and ?object.
- The WHERE clause MUST bind ?subject, ?predicate, and ?object.
- ?predicate MUST be an IRI (NamedNode), never a literal.
`.trim();

  const selectSystemRules = `
Additional mandatory rules:
- Output MUST be a SPARQL SELECT query.
`.trim();

  const systemMessage = visualizationMode
    ? `${baseSystemMessage}\n\n${visualizationSystemRules}`
    : `${baseSystemMessage}\n\n${selectSystemRules}`;

  const visualizationFallback = `
If the user intent is unclear, use:
CONSTRUCT { ?subject ?predicate ?object . }
WHERE { ?subject ?predicate ?object . }
`.trim();

  const selectFallback = `
If the user intent is unclear, use:
SELECT * WHERE { ?s ?p ?o . } LIMIT 100
`.trim();

  const safePrefixBlock = prefixBlock?.trim() || '(empty)';

  const userMessage = `
PREFIX block (MUST be placed at the very top of your output, verbatim; remove unused final prefixes):
\`\`\`
${safePrefixBlock}
\`\`\`

${visualizationMode ? visualizationFallback : selectFallback}

JSON-LD content (treat as the only dataset; write a query that works against it):
\`\`\`json
${jsonLdContent}
\`\`\`

User intent / comments:
\`\`\`
${(userComments ?? '').trim() || '(none)'}
\`\`\`
`.trim();

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
};
