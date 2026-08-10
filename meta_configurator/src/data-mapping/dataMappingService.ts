import type {TopLevelSchema} from '@/schema/jsonSchemaType';

export type DataMappingSuggestionRetryContext = {
  validationError: string;
  previousConfig: string;
};

export interface DataMappingService {
  sanitizeMappingConfig(config: string, input: any): string;
  validateMappingConfig(
    config: string,
    input: any
  ): {success: boolean; message: string} | Promise<{success: boolean; message: string}>;
  sanitizeInputDocument(input: any): any;
  generateMappingSuggestion(
    input: any,
    targetSchema: TopLevelSchema,
    userComments: string,
    retryContext?: DataMappingSuggestionRetryContext
  ): Promise<{config: string; success: boolean; message: string}>;
  performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}>;
}
