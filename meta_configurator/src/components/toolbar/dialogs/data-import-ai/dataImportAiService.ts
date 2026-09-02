import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {
  fixAndParseGeneratedJson,
  fixGeneratedJavascript,
  getApiKey,
} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryDataConversionToJson, queryOpenAI} from '@/utility/ai/aiEndpoint';
import {ValidationService} from '@/schema/validationService';
import {
  detectFormatAndParseWithFormatProcessing,
  type FormatProcessingDetectionResult,
} from '@/utility/backend/formatProcessingApi';
import {makeJsonCompatible} from '@/utility/jsonCompatible';
import {AI_ACCESS_UNAVAILABLE_MESSAGE, canQueryAi} from '@/utility/ai/aiAvailability';
import {
  buildGeneratedCodeRetryHints,
  type GeneratedCodeRetryContext,
} from '@/data-mapping/dataMappingService';
import {generateMappingFunctionSuggestion} from '@/data-mapping/dataMappingAi';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {executeSandboxedJavascriptTransform} from '@/utility/sandboxedJavascript';
import {isSchemaEmpty} from '@/schema/schemaReadingUtils';
import {nonBooleanSchema} from '@/schema/schemaTypeUtils';
import {trimDataToMaxSize} from '@/utility/trimData';
import {getErrorMessage} from '@/utility/getErrorMessage';

export type DataImportAiSchemaSource = 'infer_from_data' | 'use_current_schema';

/** The backend format detection result as it is fed into the AI prompts. */
type BackendDetectionHints = {
  backendDisplayText: string;
  backendPromptHint: string;
};

export type ImportScriptGenerationRequest = BackendDetectionHints & {
  inputFileName: string;
  inputFileType: string;
  inputDocument: string;
  userComments: string;
  schemaSource: DataImportAiSchemaSource;
  currentSchema: TopLevelSchema | undefined;
  retryContext?: GeneratedCodeRetryContext;
};

export type ParsedDataNormalizationRequest = BackendDetectionHints & {
  parsedData: unknown;
  preprocessedDataForAi: unknown;
  userComments: string;
  schemaSource: DataImportAiSchemaSource;
  currentSchema: TopLevelSchema | undefined;
};

export type FullAiImportRequest = BackendDetectionHints & {
  inputDocument: string;
  schemaSource: DataImportAiSchemaSource;
  currentSchema: TopLevelSchema | undefined;
  userComments: string;
};

export type GeneratedScriptResult = {
  config: string;
  success: boolean;
  message: string;
};

export type DataImportExecutionResult = {
  resultData: unknown;
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
  warningMessage?: string;
  confirmedMessage?: string;
};

/** The wording of the outcome messages, which names the import mode that produced them. */
type ImportResultMessages = {
  mismatchMessagePrefix: string;
  confirmationMessage: string;
  successMessage: string;
};

const CURRENT_SCHEMA_EMPTY_MESSAGE =
  'Current schema is empty. Switch schema source or load a schema first.';

/** Longest string value kept in an AI prompt preview before it is truncated. */
const MAXIMUM_PROMPT_STRING_LENGTH = 4000;
/** Characters of the uploaded document that are sent to the LLM for parser generation. */
const MAXIMUM_INPUT_SUBSET_CHARACTERS = 12000;

const IMPORT_PARSER_SYSTEM_MESSAGE_LINES = [
  'You are a JavaScript data import expert.',
  'Generate valid, executable, and robust JavaScript code for parsing raw file content.',
  'Output ONLY JavaScript code. No markdown. No backticks. No explanation.',
  'The code MUST define: function transform(input) { ... } OR async function transform(input) { ... }',
  '"input" is the full file content as a string.',
  'transform(input) MUST return a plain JSON object or JSON array.',
  'Never return undefined, NaN, Infinity, Date instances, Map, Set, or class instances.',
  'Parse structured text conservatively.',
  'Parse hierarchical blocks or sections as nested objects when appropriate instead of flattening everything into top-level key/value pairs.',
  'Ignore comments, decorative lines, separators, braces-only lines, and empty lines when they are not data.',
  'When parsing "key: value" lines, split only on the first ":".',
  'Only coerce to numbers when clearly numeric; otherwise keep strings or use null.',
  'Treat date/time-like values as strings unless the schema clearly requires something else.',
  'Do not use imports, require, network APIs, browser storage, DOM APIs, eval, Function, or constructor-based dynamic code.',
];

const TARGET_SCHEMA_INSTRUCTION_LINES = [
  'TARGET SCHEMA (MUST MATCH)',
  '- The returned JSON MUST validate against this schema.',
  '- Ensure all required properties exist (do not omit required fields).',
  '- Ensure types match exactly (e.g., integer vs number vs string).',
  '- If a required value cannot be derived, set it to null (or a conservative default matching the schema type).',
];

const NORMALIZATION_SYSTEM_MESSAGE = [
  'You are a JavaScript data normalization expert.',
  'Generate JavaScript code only, no markdown.',
  'The code must define: function transform(input) { ... }',
  'Input is ALREADY PARSED JSON object/array (not raw text).',
  'Return a NEW normalized JSON object/array (do not just return input).',
  'Do not use import/require/external libraries.',
  '',
  'Normalization goals (high priority):',
  '1) Preserve all important information.',
  '2) Improve structure: break packed string blobs into structured objects/arrays when feasible.',
  '3) Normalize scalar types: convert numeric strings to numbers, "true"/"false" to booleans.',
  '4) Convert placeholders like "?", "", "undefined", "null", "-" to null when semantically empty.',
  '5) Keep units/labels as strings when needed; do not over-convert identifiers.',
  '6) For tabular blocks encoded in text, parse rows into arrays of objects when possible.',
  '',
  'Quality constraints:',
  '- The output must be valid JSON-compatible data.',
  '- Avoid destructive dropping of fields.',
  '- If unsure about a field, keep original value.',
].join('\n');

const FULL_AI_IMPORT_SYSTEM_MESSAGE =
  'Convert the provided input to JSON. Return only valid JSON object or JSON array. Do not add explanation text. Preserve information conservatively.';

/** Returns null when the format processing service could not be reached. */
export async function detectFormatAndParseInBackend(
  fileName: string,
  fileType: string,
  inputDocument: string
): Promise<FormatProcessingDetectionResult | null> {
  try {
    return await detectFormatAndParseWithFormatProcessing(fileName, fileType, inputDocument);
  } catch {
    return null;
  }
}

/** Runs the generated script on a sample input to catch failures before the real import. */
export async function validateGeneratedImportScript(
  generatedScript: string,
  sampleInput: unknown
): Promise<{success: boolean; message: string}> {
  try {
    const transformationResult = await executeSandboxedJavascriptTransform(
      fixGeneratedJavascript(generatedScript),
      sampleInput
    );
    normalizeImportResult(transformationResult);
    return {success: true, message: 'Generated JavaScript is valid.'};
  } catch (error) {
    return {success: false, message: `Error: ${getErrorMessage(error)}`};
  }
}

/** Asks the LLM for a `transform(input)` parser for the raw content of the uploaded file. */
export async function generateImportScriptSuggestion(
  request: ImportScriptGenerationRequest
): Promise<GeneratedScriptResult> {
  const usesCurrentSchema = request.schemaSource === 'use_current_schema';
  if (usesCurrentSchema && !hasUsableSchema(request.currentSchema)) {
    return {config: '', success: false, message: CURRENT_SCHEMA_EMPTY_MESSAGE};
  }

  const apiKey = getApiKey();
  if (!canQueryAi(apiKey)) {
    return {config: '', success: false, message: AI_ACCESS_UNAVAILABLE_MESSAGE};
  }

  try {
    const generatedScript = await queryOpenAI(apiKey, [
      {
        role: 'system',
        content: buildImportParserSystemMessage(usesCurrentSchema),
      },
      {role: 'user', content: buildImportParserUserMessage(request, usesCurrentSchema)},
    ]);
    return {
      config: fixGeneratedJavascript(generatedScript),
      success: true,
      message: usesCurrentSchema
        ? 'Generated a JavaScript parser for the current app schema.'
        : 'Generated a JavaScript parser and inferred the schema from the imported data.',
    };
  } catch (error) {
    return {
      config: '',
      success: false,
      message: `Failed to generate JavaScript parser. Reason: ${getErrorMessage(error)}.`,
    };
  }
}

/**
 * Asks the LLM for a `transform(input)` script that normalizes the JSON the backend
 * already parsed, either towards the current schema or towards a cleaner structure.
 */
export async function generateNormalizationScriptSuggestion(
  request: ParsedDataNormalizationRequest
): Promise<GeneratedScriptResult> {
  const dataForPrompt = request.preprocessedDataForAi ?? request.parsedData;

  if (request.schemaSource === 'use_current_schema') {
    if (!hasUsableSchema(request.currentSchema)) {
      return {config: '', success: false, message: CURRENT_SCHEMA_EMPTY_MESSAGE};
    }
    return generateMappingFunctionSuggestion({
      language: 'javascript',
      method: 'source-data',
      inputData: dataForPrompt,
      inputDataSchema: inferJsonSchema(dataForPrompt),
      targetSchema: request.currentSchema as TopLevelSchema,
      userComments: joinPromptSections([
        formatBackendHints(request),
        request.userComments,
      ]),
    });
  }

  const apiKey = getApiKey();
  if (!canQueryAi(apiKey)) {
    return {config: '', success: false, message: AI_ACCESS_UNAVAILABLE_MESSAGE};
  }

  try {
    const generatedScript = await queryOpenAI(apiKey, [
      {role: 'system', content: NORMALIZATION_SYSTEM_MESSAGE},
      {role: 'user', content: buildNormalizationUserMessage(request, dataForPrompt)},
    ]);
    return {
      config: fixGeneratedJavascript(generatedScript),
      success: true,
      message: 'Generated AI normalization JavaScript from parsed backend data.',
    };
  } catch (error) {
    return {
      config: '',
      success: false,
      message: `Failed to generate AI normalization script. Reason: ${getErrorMessage(error)}.`,
    };
  }
}

export async function runImportWithGeneratedScript(
  inputDocument: unknown,
  generatedScript: string,
  schemaSource: DataImportAiSchemaSource,
  currentSchema: TopLevelSchema | undefined
): Promise<DataImportExecutionResult> {
  try {
    const transformationResult = await executeSandboxedJavascriptTransform(
      fixGeneratedJavascript(generatedScript),
      inputDocument
    );
    return prepareImportResult(transformationResult, schemaSource, currentSchema, {
      mismatchMessagePrefix: 'Imported JSON does not match current schema',
      confirmationMessage: 'Data imported despite schema mismatch warning.',
      successMessage: 'Data imported successfully.',
    });
  } catch (error) {
    return failedImport(`Import failed. Reason: ${getErrorMessage(error)}.`);
  }
}

export async function runDirectParsedImport(
  parsedData: unknown,
  schemaSource: DataImportAiSchemaSource,
  currentSchema: TopLevelSchema | undefined
): Promise<DataImportExecutionResult> {
  try {
    return prepareImportResult(parsedData, schemaSource, currentSchema, {
      mismatchMessagePrefix: 'Parsed JSON does not match current schema',
      confirmationMessage:
        'Data imported via direct backend parsing despite schema mismatch warning.',
      successMessage: 'Data imported successfully via direct backend parsing.',
    });
  } catch (error) {
    return failedImport(`Direct parsing import failed. Reason: ${getErrorMessage(error)}.`);
  }
}

/** Converts the uploaded document to JSON with a single LLM call, without any script. */
export async function runFullAiImport(
  request: FullAiImportRequest
): Promise<DataImportExecutionResult> {
  const usesCurrentSchema = request.schemaSource === 'use_current_schema';
  if (usesCurrentSchema && !hasUsableSchema(request.currentSchema)) {
    return failedImport(CURRENT_SCHEMA_EMPTY_MESSAGE);
  }

  const apiKey = getApiKey();
  if (!canQueryAi(apiKey)) {
    return failedImport(AI_ACCESS_UNAVAILABLE_MESSAGE);
  }

  try {
    const aiResponse = usesCurrentSchema
      ? await queryDataConversionToJson(
          apiKey,
          request.inputDocument,
          JSON.stringify(request.currentSchema)
        )
      : await queryOpenAI(apiKey, [
          {role: 'system', content: FULL_AI_IMPORT_SYSTEM_MESSAGE},
          {
            role: 'user',
            content: joinPromptSections([
              formatBackendHints(request),
              `Input document:\n${request.inputDocument}`,
              request.userComments ? `User hints: ${request.userComments}` : '',
            ]),
          },
        ]);

    return prepareImportResult(
      fixAndParseGeneratedJson(aiResponse),
      request.schemaSource,
      request.currentSchema,
      {
        mismatchMessagePrefix: 'AI-converted JSON does not match current schema',
        confirmationMessage: 'Data imported via full AI conversion despite schema mismatch warning.',
        successMessage: 'Data imported successfully via full AI conversion.',
      }
    );
  } catch (error) {
    return failedImport(`Full AI import failed. Reason: ${getErrorMessage(error)}.`);
  }
}

function hasUsableSchema(schema: TopLevelSchema | undefined): boolean {
  return schema !== undefined && !isSchemaEmpty(schema);
}

function failedImport(message: string): DataImportExecutionResult {
  return {resultData: {}, success: false, message};
}

function joinPromptSections(sections: string[]): string {
  return sections
    .map(section => section.trim())
    .filter(section => section.length > 0)
    .join('\n\n');
}

function formatBackendHints(hints: BackendDetectionHints): string {
  return joinPromptSections([
    hints.backendDisplayText ? `Backend detection: ${hints.backendDisplayText}` : '',
    hints.backendPromptHint ? `Backend parser guidance: ${hints.backendPromptHint}` : '',
  ]);
}

function buildImportParserSystemMessage(usesCurrentSchema: boolean): string {
  return [
    ...IMPORT_PARSER_SYSTEM_MESSAGE_LINES,
    usesCurrentSchema
      ? 'A target schema is provided. The returned JSON MUST validate against it. Schema conformance has priority.'
      : 'If no schema is provided, infer a suitable JSON structure from the input format and content.',
  ].join('\n');
}

function buildImportParserUserMessage(
  request: ImportScriptGenerationRequest,
  usesCurrentSchema: boolean
): string {
  const schemaInstruction = usesCurrentSchema
    ? [...TARGET_SCHEMA_INSTRUCTION_LINES, '', JSON.stringify(request.currentSchema)].join('\n')
    : 'No schema is provided. Infer a suitable JSON structure from the input format and content.';

  return joinPromptSections([
    `Input file name: ${request.inputFileName || 'uploaded-file'}`,
    `Input file type: ${request.inputFileType || 'unknown'}`,
    formatBackendHints(request),
    `Input file subset:\n${request.inputDocument.slice(0, MAXIMUM_INPUT_SUBSET_CHARACTERS)}`,
    schemaInstruction,
    'Generate the JavaScript parser now.',
    request.userComments ? `User hints:\n${request.userComments}` : '',
    buildGeneratedCodeRetryHints(request.retryContext),
  ]);
}

function buildNormalizationUserMessage(
  request: ParsedDataNormalizationRequest,
  dataForPrompt: unknown
): string {
  return joinPromptSections([
    formatBackendHints(request),
    'Parsed JSON preview (truncated for prompt efficiency):\n' +
      JSON.stringify(trimDataToMaxSize(truncateLongStrings(dataForPrompt)), null, 2),
    'Please generate a robust transform(input) implementation with helper functions for scalar coercion and optional parsing of table-like text fields.',
    request.userComments ? `User hints:\n${request.userComments}` : '',
  ]);
}

/** Shortens long string values so that a single field cannot blow up the prompt. */
function truncateLongStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length <= MAXIMUM_PROMPT_STRING_LENGTH) {
      return value;
    }
    return `${value.slice(0, MAXIMUM_PROMPT_STRING_LENGTH)}...[TRUNCATED_${
      value.length - MAXIMUM_PROMPT_STRING_LENGTH
    }_CHARS]`;
  }
  if (Array.isArray(value)) {
    return value.map(truncateLongStrings);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([propertyName, propertyValue]) => [
        propertyName,
        truncateLongStrings(propertyValue),
      ])
    );
  }
  return value;
}

function prepareImportResult(
  rawResult: unknown,
  schemaSource: DataImportAiSchemaSource,
  currentSchema: TopLevelSchema | undefined,
  messages: ImportResultMessages
): DataImportExecutionResult {
  const normalizedResult = normalizeImportResult(rawResult);
  if (schemaSource !== 'use_current_schema') {
    return {resultData: normalizedResult, success: true, message: messages.successMessage};
  }
  if (!hasUsableSchema(currentSchema)) {
    return failedImport(CURRENT_SCHEMA_EMPTY_MESSAGE);
  }

  const schema = currentSchema as TopLevelSchema;
  const adaptedResult = adaptResultToSchemaRoot(normalizedResult, schema);
  const validationErrors = new ValidationService(schema).validate(adaptedResult).errors;
  if (validationErrors.length === 0) {
    return {resultData: adaptedResult, success: true, message: messages.successMessage};
  }

  const formattedValidationErrors = validationErrors
    .slice(0, 5)
    .map(error => `${error.message} at "${error.instancePath}"`)
    .join('; ');
  return {
    resultData: adaptedResult,
    success: true,
    message: 'Schema mismatch detected. Click import again to continue anyway.',
    requiresConfirmation: true,
    warningMessage: `${messages.mismatchMessagePrefix}: ${formattedValidationErrors}`,
    confirmedMessage: messages.confirmationMessage,
  };
}

function normalizeImportResult(result: unknown): unknown {
  const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
  const normalizedResult = makeJsonCompatible(parsedResult);
  if (normalizedResult === null || typeof normalizedResult !== 'object') {
    throw new Error('Parser output must be a JSON object or array.');
  }
  return normalizedResult;
}

/**
 * Wraps the result into the single required root property of the schema, so that a
 * parser returning only the payload still validates against such a schema.
 */
function adaptResultToSchemaRoot(result: unknown, schema: TopLevelSchema): unknown {
  const schemaObject = nonBooleanSchema(schema);
  const requiredPropertyNames = schemaObject?.required ?? [];
  const schemaProperties = schemaObject?.properties;
  if (requiredPropertyNames.length !== 1 || !schemaProperties) {
    return result;
  }

  const requiredRootPropertyName = requiredPropertyNames[0];
  if (!requiredRootPropertyName || !(requiredRootPropertyName in schemaProperties)) {
    return result;
  }
  if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
    if (requiredRootPropertyName in (result as Record<string, unknown>)) {
      return result;
    }
  }

  return {[requiredRootPropertyName]: result};
}
