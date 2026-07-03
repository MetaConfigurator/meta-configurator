import type {
  DataMappingService,
  DataMappingSuggestionRetryContext,
} from '@/data-mapping/dataMappingService';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {trimDataToMaxSize} from '@/utility/trimData';
import {cloneDeep} from 'lodash';
import {generateJavascriptSchemaMappingSuggestion} from '@/data-mapping/javascript/generateJavascriptSchemaMappingSuggestion';
import {getBackendPreprocessedInputForAi} from '@/data-mapping/getBackendPreprocessedInputForAi';

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
      const transformFn = this.compileTransformFunction(sanitizedConfig);
      const result = await Promise.resolve(transformFn(input));
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

  validateMappingConfig(config: string, input: any): {success: boolean; message: string} {
    const inputDataSubset = trimDataToMaxSize(input);

    try {
      const sanitizedConfig = this.sanitizeMappingConfig(config, inputDataSubset);
      const transformFn = this.compileTransformFunction(sanitizedConfig);
      transformFn(inputDataSubset);
      return {success: true, message: 'Mapping configuration is valid.'};
    } catch (e: any) {
      return {success: false, message: `Error: ${e?.message ?? String(e)}`};
    }
  }

  private compileTransformFunction(code: string): (input: any) => any {
    const wrapper = `
"use strict";
${code}
if (typeof transform !== "function") {
  throw new Error("Mapping must define a function: transform(input).");
}
return transform;
`;

    // eslint-disable-next-line no-new-func
    const factory = new Function(wrapper) as () => (input: any) => any;
    return factory();
  }
}
