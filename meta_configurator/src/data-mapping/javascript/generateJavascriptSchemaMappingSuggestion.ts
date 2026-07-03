import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryJavascriptExpression} from '@/utility/ai/aiEndpoint';
import type {DataMappingSuggestionRetryContext} from '@/data-mapping/dataMappingService';
import {
  JS_REFERENCE_GUIDE,
  JS_INPUT_EXAMPLE,
  JS_INPUT_EXAMPLE_SCHEMA,
  JS_OUTPUT_EXAMPLE,
  JS_OUTPUT_EXAMPLE_SCHEMA,
  JS_EXAMPLE_CODE,
} from '@/data-mapping/javascript/javascriptExamples';

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

export async function generateJavascriptSchemaMappingSuggestion(
  inputPreview: unknown,
  targetSchema: TopLevelSchema,
  userComments: string,
  retryContext?: DataMappingSuggestionRetryContext,
  backendDisplayText: string = '',
  backendPromptHint: string = ''
): Promise<{config: string; success: boolean; message: string}> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      config: '',
      success: false,
      message: 'Missing API key. Please set your API key first.',
    };
  }

  const inputFileSchema = inferJsonSchema(inputPreview);
  const referenceStr = JSON.stringify(JS_REFERENCE_GUIDE);
  const inputExampleStr = JSON.stringify(JS_INPUT_EXAMPLE);
  const inputExampleSchemaStr = JSON.stringify(JS_INPUT_EXAMPLE_SCHEMA);
  const outputExampleStr = JSON.stringify(JS_OUTPUT_EXAMPLE);
  const outputExampleSchemaStr = JSON.stringify(JS_OUTPUT_EXAMPLE_SCHEMA);
  const exampleCodeStr = JSON.stringify(JS_EXAMPLE_CODE);
  const inputFileSchemaStr = JSON.stringify(inputFileSchema);
  const targetSchemaStr = JSON.stringify(targetSchema);
  const inputPreviewStr = JSON.stringify(inputPreview);

  const combinedUserComments = [
    backendDisplayText ? `Backend preview: ${backendDisplayText}` : '',
    backendPromptHint ? `Backend parser guidance: ${backendPromptHint}` : '',
    userComments,
    buildRetryHints(retryContext),
  ]
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .join('\n\n');

  try {
    const responseStr = await queryJavascriptExpression(
      apiKey,
      referenceStr,
      inputExampleStr,
      inputExampleSchemaStr,
      outputExampleStr,
      outputExampleSchemaStr,
      exampleCodeStr,
      inputPreviewStr,
      inputFileSchemaStr,
      targetSchemaStr,
      combinedUserComments
    );
    const fixed = fixGeneratedExpression(responseStr, ['javascript', 'js']);
    return {
      config: fixed,
      success: true,
      message: 'JavaScript mapping generated successfully.',
    };
  } catch (_error) {
    return {
      config: '',
      success: false,
      message: 'Failed to generate JavaScript mapping. Please review the generated code.',
    };
  }
}
