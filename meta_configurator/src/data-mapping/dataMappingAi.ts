import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  buildGeneratedCodeRetryHints,
  type GeneratedCodeRetryContext,
} from '@/data-mapping/dataMappingService';
import {
  fixAndParseGeneratedJson,
  fixGeneratedExpression,
  getApiKey,
} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryOpenAI} from '@/utility/ai/aiEndpoint';
import {AI_ACCESS_UNAVAILABLE_MESSAGE, canQueryAi} from '@/utility/ai/aiAvailability';
import {trimDataToMaxSize} from '@/utility/trimData';
import {JAVASCRIPT_MAPPING_SYSTEM_MESSAGE} from '@/data-mapping/javascript/javascriptExamples';
import {
  JSONATA_EXPRESSION,
  JSONATA_INPUT_EXAMPLE,
  JSONATA_INPUT_EXAMPLE_SCHEMA,
  JSONATA_OUTPUT_EXAMPLE,
  JSONATA_OUTPUT_EXAMPLE_SCHEMA,
  JSONATA_REFERENCE_GUIDE,
} from '@/data-mapping/jsonata/jsonataExamples';
import {getErrorMessage} from '@/utility/getErrorMessage';

export type MappingGenerationLanguage = 'jsonata' | 'javascript';
export type MappingGenerationMethod = 'source-data' | 'inferred-source-schema';

type SharedMappingSuggestionRequestFields = {
  language: MappingGenerationLanguage;
  targetSchema: TopLevelSchema;
  userComments: string;
  retryContext?: GeneratedCodeRetryContext;
};

export type MappingFunctionSuggestionRequest =
  | (SharedMappingSuggestionRequestFields & {
      method: 'source-data';
      inputData: unknown;
      /** Schema of the input data, added to the prompt as extra guidance when known. */
      inputDataSchema?: unknown;
    })
  | (SharedMappingSuggestionRequestFields & {
      method: 'inferred-source-schema';
      sourceSchema: TopLevelSchema;
    });

const LANGUAGE_LABELS: Record<MappingGenerationLanguage, string> = {
  jsonata: 'JSONata',
  javascript: 'JavaScript',
};

const CODE_FENCE_LANGUAGES: Record<MappingGenerationLanguage, string[]> = {
  jsonata: ['jsonata', 'json'],
  javascript: ['javascript', 'js'],
};

const JSONATA_SYSTEM_MESSAGE = `You are a JSON and JSONata Data Mapping expert. Your task is to generate a JSONata expression for transforming JSON input documents to satisfy the given target JSON schema.
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

const SYSTEM_MESSAGES: Record<MappingGenerationLanguage, string> = {
  jsonata: JSONATA_SYSTEM_MESSAGE,
  javascript: JAVASCRIPT_MAPPING_SYSTEM_MESSAGE,
};

const CLOSING_INSTRUCTIONS: Record<
  MappingGenerationLanguage,
  Record<MappingGenerationMethod, string[]>
> = {
  jsonata: {
    'source-data': [
      'Generate a multi-line JSONata expression that transforms the input data to satisfy the target schema.',
      'Use only the actual input data preview and the target schema. Do not rely on any additional inferred source schema.',
      'Return only the JSONata expression.',
    ],
    'inferred-source-schema': [
      'Generate a multi-line JSONata expression that maps documents matching the source schema to the target schema.',
      'If the source schema contains examples, use them as hints.',
      'Do not assume fields that are not described by the source schema.',
      'Return only the JSONata expression.',
    ],
  },
  javascript: {
    'source-data': [
      'Generate the JavaScript mapping code now.',
      'Use only the actual input data preview and the target schema. Do not rely on an additional inferred source schema.',
      'Remember: output ONLY code that defines function transform(input) { ... } and returns the result object.',
    ],
    'inferred-source-schema': [
      'Generate the JavaScript mapping code now.',
      'The function must accept input documents matching the source schema and return output that satisfies the target schema.',
      'If the source schema contains examples, use them as hints.',
      'Do not rely on runtime data examples beyond the source schema.',
      'Remember: output ONLY code that defines function transform(input) { ... } and returns the result object.',
    ],
  },
};

export async function generateMappingFunctionSuggestion(
  request: MappingFunctionSuggestionRequest
): Promise<{config: string; success: boolean; message: string}> {
  const apiKey = getApiKey();
  if (!canQueryAi(apiKey)) {
    return {config: '', success: false, message: AI_ACCESS_UNAVAILABLE_MESSAGE};
  }

  const languageLabel = LANGUAGE_LABELS[request.language];
  try {
    const generatedConfiguration = await queryOpenAI(apiKey, [
      {role: 'system', content: SYSTEM_MESSAGES[request.language]},
      {role: 'user', content: buildMappingUserMessage(request)},
    ]);

    return {
      config: fixGeneratedExpression(
        generatedConfiguration,
        CODE_FENCE_LANGUAGES[request.language]
      ),
      success: true,
      message:
        request.method === 'source-data'
          ? `${languageLabel} mapping generated from source data and target schema.`
          : `${languageLabel} mapping generated from inferred source schema and target schema.`,
    };
  } catch (error) {
    return {
      config: '',
      success: false,
      message: `Failed to generate ${languageLabel} mapping. ${getErrorMessage(error)}`,
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
    return {resultData: {}, success: false, message: AI_ACCESS_UNAVAILABLE_MESSAGE};
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
      message: `Direct AI mapping failed. ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Both languages and both generation methods send the same message layout: the source
 * section, the target schema, method-specific closing instructions and optional hints.
 */
function buildMappingUserMessage(request: MappingFunctionSuggestionRequest): string {
  const messageParts =
    request.method === 'source-data'
      ? ['REAL INPUT DATA SUBSET', JSON.stringify(trimDataToMaxSize(request.inputData))]
      : ['SOURCE INPUT SCHEMA', JSON.stringify(request.sourceSchema)];

  if (request.method === 'source-data' && request.inputDataSchema !== undefined) {
    messageParts.push('', 'REAL INPUT DATA SCHEMA', JSON.stringify(request.inputDataSchema));
  }

  messageParts.push(
    '',
    'TARGET OUTPUT SCHEMA',
    JSON.stringify(request.targetSchema),
    '',
    ...CLOSING_INSTRUCTIONS[request.language][request.method]
  );

  if (request.userComments.trim().length > 0) {
    messageParts.push('', 'USER HINTS', request.userComments.trim());
  }

  const retryHints = buildGeneratedCodeRetryHints(request.retryContext);
  if (retryHints.length > 0) {
    messageParts.push('', 'RETRY CONTEXT', retryHints);
  }

  return messageParts.join('\n');
}
