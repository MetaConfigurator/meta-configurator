import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import type {Ref} from 'vue';

export interface DataMappingService {
  sanitizeMappingConfig(config: string, input: any): string;
  validateMappingConfig(config: string, input: any): {success: boolean; message: string};
  sanitizeInputDocument(input: any): any;
  generateMappingSuggestion(
    input: any,
    targetSchema: TopLevelSchema,
    userComments: string
  ): Promise<{config: string; success: boolean; message: string}>;
  performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}>;
}
