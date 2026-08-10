import type {
  DataMappingService,
  DataMappingSuggestionRetryContext,
} from '@/data-mapping/dataMappingService';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {cloneDeep} from 'lodash';
import {generateJavascriptSchemaMappingSuggestion} from '@/data-mapping/javascript/generateJavascriptSchemaMappingSuggestion';
import {getBackendPreprocessedInputForAi} from '@/data-mapping/getBackendPreprocessedInputForAi';
import {executeSandboxedJavascriptTransform} from '@/utility/sandboxedJavascript';

export class DataMappingServiceJavascript implements DataMappingService {
  async generateMappingSuggestion(
    input: any,
    targetSchema: TopLevelSchema,
    userComments: string,
    retryContext?: DataMappingSuggestionRetryContext
  ): Promise<{config: string; success: boolean; message: string}> {
    const preview = await getBackendPreprocessedInputForAi(input, 'json');
    return generateJavascriptSchemaMappingSuggestion(
      preview.inputPreview,
      targetSchema,
      userComments,
      retryContext,
      preview.backendDisplayText,
      preview.backendPromptHint
    );
  }

  async performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}> {
    try {
      const sanitizedConfig = this.sanitizeMappingConfig(config, input);
      const result = await executeSandboxedJavascriptTransform(sanitizedConfig, input);
      return {
        resultData: result,
        success: true,
        message: 'Data mapping performed successfully.',
      };
    } catch (e: any) {
      return {
        resultData: {},
        success: false,
        message: `Data mapping failed. Reason: ${e?.message ?? String(e)}.`,
      };
    }
  }

  sanitizeInputDocument(input: any): any {
    return cloneDeep(input);
  }

  sanitizeMappingConfig(config: string, _input: any): string {
    return config
      .replace(/```(javascript|js)?/gi, '')
      .replace(/```/g, '')
      .trim();
  }

  async validateMappingConfig(
    config: string,
    input: any
  ): Promise<{success: boolean; message: string}> {
    const inputDataSubset = trimDataToMaxSize(input);

    try {
      const sanitizedConfig = this.sanitizeMappingConfig(config, inputDataSubset);
      await executeSandboxedJavascriptTransform(sanitizedConfig, inputDataSubset);
      return {success: true, message: 'Mapping configuration is valid.'};
    } catch (e: any) {
      return {success: false, message: `Error: ${e?.message ?? String(e)}`};
    }
  }
}
