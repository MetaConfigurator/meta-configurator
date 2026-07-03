import {
  preprocessParsedDataForAiWithFormatProcessing,
  type FormatProcessingPreprocessOptions,
} from '@/utility/backend/formatProcessingApi';

export async function getBackendPreprocessedInputForAi(
  input: unknown,
  format: string = 'json',
  preprocessOptions?: FormatProcessingPreprocessOptions
): Promise<{
  inputPreview: unknown;
  backendDisplayText: string;
  backendPromptHint: string;
}> {
  try {
    const response = await preprocessParsedDataForAiWithFormatProcessing(
      input,
      format,
      preprocessOptions
    );
    return {
      inputPreview: response.preprocessed_for_ai ?? input,
      backendDisplayText: response.display_text ?? '',
      backendPromptHint: response.ai_prompt_hint ?? '',
    };
  } catch (_error) {
    return {
      inputPreview: input,
      backendDisplayText: '',
      backendPromptHint: '',
    };
  }
}
