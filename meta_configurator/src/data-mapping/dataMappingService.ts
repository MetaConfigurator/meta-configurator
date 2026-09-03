/** Context passed back to the LLM when a previously generated mapping or parser failed. */
export type GeneratedCodeRetryContext = {
  validationError: string;
  previousCode: string;
};

export type DataMappingResult = {
  resultData: unknown;
  success: boolean;
  message: string;
};

export type DataMappingSuggestionResult = {
  config: string;
  success: boolean;
  message: string;
};

export type DataMappingValidationResult = {
  success: boolean;
  message: string;
};

/** Returns prompt hints describing the failed attempt, or an empty string without one. */
export function buildGeneratedCodeRetryHints(retryContext?: GeneratedCodeRetryContext): string {
  if (!retryContext) {
    return '';
  }

  const validationError = retryContext.validationError.trim();
  const previousCode = retryContext.previousCode.trim();
  if (validationError.length === 0 || previousCode.length === 0) {
    return '';
  }

  return [
    'The previously generated code failed validation or execution.',
    'Error:',
    validationError,
    'Previous code:',
    previousCode,
    'Generate an improved version that fixes this error and still solves the original task.',
  ].join('\n');
}

export interface DataMappingService {
  validateMappingConfig(
    mappingConfiguration: string,
    inputData: unknown
  ): Promise<DataMappingValidationResult>;
  sanitizeInputDocument(inputData: unknown): unknown;
  performDataMapping(inputData: unknown, mappingConfiguration: string): Promise<DataMappingResult>;
}
