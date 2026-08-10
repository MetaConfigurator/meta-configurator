import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import type {DataMappingSuggestionRetryContext} from '@/data-mapping/dataMappingService';
import {
  fixAndParseGeneratedJson,
  fixGeneratedExpression,
  getApiKey,
} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryOpenAI} from '@/utility/ai/aiEndpoint';
import {canQueryAi} from '@/utility/ai/aiAvailability';
import {trimDataToMaxSize} from '@/utility/trimData';
import {
  JS_REFERENCE_GUIDE,
  JS_INPUT_EXAMPLE,
  JS_INPUT_EXAMPLE_SCHEMA,
  JS_OUTPUT_EXAMPLE,
  JS_OUTPUT_EXAMPLE_SCHEMA,
  JS_EXAMPLE_CODE,
} from '@/data-mapping/javascript/javascriptExamples';
import {
  JSONATA_EXPRESSION,
  JSONATA_INPUT_EXAMPLE,
  JSONATA_INPUT_EXAMPLE_SCHEMA,
  JSONATA_OUTPUT_EXAMPLE,
  JSONATA_OUTPUT_EXAMPLE_SCHEMA,
  JSONATA_REFERENCE_GUIDE,
} from '@/data-mapping/jsonata/jsonataExamples';

export type MappingGenerationLanguage = 'jsonata' | 'javascript';
export type MappingGenerationMethod = 'source-data' | 'inferred-source-schema';

type GenerateMappingFunctionSuggestionParams =
  | {
      language: MappingGenerationLanguage;
      method: 'source-data';
      inputData: unknown;
      targetSchema: TopLevelSchema;
      userComments: string;
      retryContext?: DataMappingSuggestionRetryContext;
    }
  | {
      language: MappingGenerationLanguage;
      method: 'inferred-source-schema';
      sourceSchema: TopLevelSchema;
      targetSchema: TopLevelSchema;
      userComments: string;
      retryContext?: DataMappingSuggestionRetryContext;
    };

export async function generateMappingFunctionSuggestion(
  params: GenerateMappingFunctionSuggestionParams
): Promise<{config: string; success: boolean; message: string}> {
  const apiKey = getApiKey();
  if (!canQueryAi(apiKey)) {
    return {
      config: '',
      success: false,
      message: 'AI access is not configured. Please configure an API endpoint or relay first.',
    };
  }

  const response =
    params.language === 'jsonata'
      ? await queryJsonataSuggestion(apiKey, params)
      : await queryJavascriptSuggestion(apiKey, params);

  try {
    return {
      config: fixGeneratedExpression(
        response,
        params.language === 'jsonata' ? ['jsonata', 'json'] : ['javascript', 'js']
      ),
      success: true,
      message:
        params.method === 'source-data'
          ? `${formatLanguageLabel(
              params.language
            )} mapping generated from source data and target schema.`
          : `${formatLanguageLabel(
              params.language
            )} mapping generated from inferred source schema and target schema.`,
    };
  } catch (error) {
    return {
      config: response,
      success: false,
      message: `Failed to generate ${formatLanguageLabel(params.language)} mapping. ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function performDirectAiTargetSchemaMapping(
  inputData: unknown,
  targetSchema: TopLevelSchema,
  userComments: string
): Promise<{resultData: unknown; success: boolean; message: string}> {
  const apiKey = getApiKey();
  if (!canQueryAi(apiKey)) {
    return {
      resultData: {},
      success: false,
      message: 'AI access is not configured. Please configure an API endpoint or relay first.',
    };
  }

  const systemMessage = [
    'You are a JSON data transformation expert.',
    'Transform the provided JSON document so that the result strictly satisfies the target JSON schema.',
    'Return ONLY valid JSON. No markdown. No explanation.',
    'Preserve information conservatively when possible, but target schema compliance has priority.',
    'Never omit required properties. If a required value cannot be derived, use null or a conservative default that matches the schema type.',
  ].join('\n');

  const userMessageParts = [
    'CURRENT JSON DATA',
    JSON.stringify(inputData),
    '',
    'TARGET JSON SCHEMA',
    JSON.stringify(targetSchema),
  ];

  if (userComments.trim().length > 0) {
    userMessageParts.push('', 'USER HINTS', userComments.trim());
  }

  try {
    const response = await queryOpenAI(apiKey, [
      {role: 'system', content: systemMessage},
      {role: 'user', content: userMessageParts.join('\n')},
    ]);

    return {
      resultData: fixAndParseGeneratedJson(response),
      success: true,
      message: 'AI mapping executed successfully.',
    };
  } catch (error) {
    return {
      resultData: {},
      success: false,
      message: `Direct AI mapping failed. ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function queryJsonataSuggestion(
  apiKey: string,
  params: GenerateMappingFunctionSuggestionParams
): Promise<string> {
  const systemMessage = `You are a JSON and JSONata Data Mapping expert. Your task is to generate a JSONata expression for transforming JSON input documents to satisfy the given target JSON schema.
Only output valid JSONata, which is a single JSON-like expression. Do not use JavaScript-style blocks or function declarations like "function($x) {...}".
Remember: JSONata is a declarative query and transformation language with syntax similar to JSON. It does not support full function declarations. Transformations must be inline.
\`\`\`${JSON.stringify(JSONATA_REFERENCE_GUIDE)}\`\`\`
Example input file: \`\`\`${JSON.stringify(JSONATA_INPUT_EXAMPLE)}\`\`\`.
Example input schema: \`\`\`${JSON.stringify(JSONATA_INPUT_EXAMPLE_SCHEMA)}\`\`\`.
Example output schema: \`\`\`${JSON.stringify(JSONATA_OUTPUT_EXAMPLE_SCHEMA)}\`\`\`.
For these examples you should generate the following JSONata expression: \`\`\`${JSON.stringify(
    JSONATA_EXPRESSION
  )}\`\`\`.
The expression would transform the input file to the following output file (as intended): \`\`\`${JSON.stringify(
    JSONATA_OUTPUT_EXAMPLE
  )}\`\`\`.
Return ONLY a valid JSONata expression with no surrounding explanation.`;

  const userMessage =
    params.method === 'source-data'
      ? buildJsonataDataUserMessage(params.inputData, params.targetSchema, params.userComments)
      : buildJsonataSchemaUserMessage(
          params.sourceSchema,
          params.targetSchema,
          params.userComments
        );

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
}

async function queryJavascriptSuggestion(
  apiKey: string,
  params: GenerateMappingFunctionSuggestionParams
): Promise<string> {
  const systemMessage = [
    'You are a JavaScript data mapping expert.',
    '',
    'TASK',
    'Generate JavaScript code that transforms an input JSON object into a new object',
    'that satisfies the provided target JSON Schema.',
    '',
    'STRICT OUTPUT RULES (MUST FOLLOW)',
    '- Output ONLY JavaScript code. No markdown. No backticks. No explanation.',
    '- The code MUST define: function transform(input) { ... }',
    '- transform(input) MUST return the mapped object.',
    '- Do NOT use imports, require, export, or external libraries.',
    '- Do NOT access network, file system, environment variables, Date.now, random, or global state.',
    '- Prefer safe access (optional chaining) and sensible fallbacks (null).',
    '- Keep it simple and conservative: map existing values, avoid inventing new data.',
    '',
    'REFERENCE (guidelines & allowed patterns)',
    JSON.stringify(JS_REFERENCE_GUIDE),
    '',
    'EXAMPLE INPUT',
    JSON.stringify(JS_INPUT_EXAMPLE),
    '',
    'EXAMPLE INPUT SCHEMA',
    JSON.stringify(JS_INPUT_EXAMPLE_SCHEMA),
    '',
    'EXAMPLE OUTPUT SCHEMA',
    JSON.stringify(JS_OUTPUT_EXAMPLE_SCHEMA),
    '',
    'EXAMPLE MAPPING CODE',
    JSON.stringify(JS_EXAMPLE_CODE),
    '',
    'EXAMPLE OUTPUT (intended)',
    JSON.stringify(JS_OUTPUT_EXAMPLE),
  ].join('\n');

  const userMessage =
    params.method === 'source-data'
      ? buildJavascriptDataUserMessage(
          params.inputData,
          params.targetSchema,
          params.userComments,
          params.retryContext
        )
      : buildJavascriptSchemaUserMessage(
          params.sourceSchema,
          params.targetSchema,
          params.userComments,
          params.retryContext
        );

  return queryOpenAI(apiKey, [
    {role: 'system', content: systemMessage},
    {role: 'user', content: userMessage},
  ]);
}

function buildJsonataDataUserMessage(
  inputData: unknown,
  targetSchema: TopLevelSchema,
  userComments: string
): string {
  const messageParts = [
    'REAL INPUT DATA SUBSET',
    JSON.stringify(trimDataToMaxSize(inputData)),
    '',
    'TARGET OUTPUT SCHEMA',
    JSON.stringify(targetSchema),
    '',
    'Generate a multi-line JSONata expression that transforms the input data to satisfy the target schema.',
    'Use only the actual input data preview and the target schema. Do not rely on any additional inferred source schema.',
    'Return only the JSONata expression.',
  ];

  if (userComments.trim().length > 0) {
    messageParts.push('', 'USER HINTS', userComments.trim());
  }

  return messageParts.join('\n');
}

function buildJsonataSchemaUserMessage(
  sourceSchema: TopLevelSchema,
  targetSchema: TopLevelSchema,
  userComments: string
): string {
  const messageParts = [
    'SOURCE INPUT SCHEMA',
    JSON.stringify(sourceSchema),
    '',
    'TARGET OUTPUT SCHEMA',
    JSON.stringify(targetSchema),
    '',
    'Generate a multi-line JSONata expression that maps documents matching the source schema to the target schema.',
    'If the source schema contains examples, use them as hints.',
    'Do not assume fields that are not described by the source schema.',
    'Return only the JSONata expression.',
  ];

  if (userComments.trim().length > 0) {
    messageParts.push('', 'USER HINTS', userComments.trim());
  }

  return messageParts.join('\n');
}

function buildJavascriptDataUserMessage(
  inputData: unknown,
  targetSchema: TopLevelSchema,
  userComments: string,
  retryContext?: DataMappingSuggestionRetryContext
): string {
  const messageParts = [
    'REAL INPUT DATA SUBSET',
    JSON.stringify(trimDataToMaxSize(inputData)),
    '',
    'TARGET OUTPUT SCHEMA',
    JSON.stringify(targetSchema),
    '',
    'Generate the JavaScript mapping code now.',
    'Use only the actual input data preview and the target schema. Do not rely on an additional inferred source schema.',
    'Remember: output ONLY code that defines function transform(input) { ... } and returns the result object.',
  ];

  appendUserHints(messageParts, userComments, retryContext);
  return messageParts.join('\n');
}

function buildJavascriptSchemaUserMessage(
  sourceSchema: TopLevelSchema,
  targetSchema: TopLevelSchema,
  userComments: string,
  retryContext?: DataMappingSuggestionRetryContext
): string {
  const messageParts = [
    'SOURCE INPUT SCHEMA',
    JSON.stringify(sourceSchema),
    '',
    'TARGET OUTPUT SCHEMA',
    JSON.stringify(targetSchema),
    '',
    'Generate the JavaScript mapping code now.',
    'The function must accept input documents matching the source schema and return output that satisfies the target schema.',
    'If the source schema contains examples, use them as hints.',
    'Do not rely on runtime data examples beyond the source schema.',
    'Remember: output ONLY code that defines function transform(input) { ... } and returns the result object.',
  ];

  appendUserHints(messageParts, userComments, retryContext);
  return messageParts.join('\n');
}

function appendUserHints(
  messageParts: string[],
  userComments: string,
  retryContext?: DataMappingSuggestionRetryContext
) {
  const retryHints = buildRetryHints(retryContext);

  if (userComments.trim().length > 0) {
    messageParts.push('', 'USER HINTS', userComments.trim());
  }

  if (retryHints.length > 0) {
    messageParts.push('', 'RETRY CONTEXT', retryHints);
  }
}

function buildRetryHints(retryContext?: DataMappingSuggestionRetryContext): string {
  if (!retryContext) {
    return '';
  }

  const validationError = retryContext.validationError.trim();
  const previousConfig = retryContext.previousConfig.trim();
  if (validationError.length === 0 || previousConfig.length === 0) {
    return '';
  }

  return [
    'Previous JavaScript mapping attempt failed validation or execution.',
    'Error:',
    validationError,
    'Previous mapping code:',
    previousConfig,
    'Generate an improved JavaScript mapping that fixes this error and still maps the input to the target schema.',
  ].join('\n');
}

function formatLanguageLabel(language: MappingGenerationLanguage): string {
  return language === 'jsonata' ? 'JSONata' : 'JavaScript';
}
