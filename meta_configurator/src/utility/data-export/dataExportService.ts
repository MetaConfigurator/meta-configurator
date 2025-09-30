import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import type {Ref} from 'vue';

export interface DataExportService {
  generateMappingSuggestion(
    input: any,
    inputSchema: TopLevelSchema,
    outputDescription: string
  ): Promise<{config: string; success: boolean; message: string}>;
  performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}>;
}
