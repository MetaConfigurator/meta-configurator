import type {DataMappingService} from '@/data-mapping/dataMappingService';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {fixAndParseGeneratedJson, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryDataMappingConfig} from '@/utility/ai/aiEndpoint';
import {
  extractInvalidSourcePathsFromConfig,
  extractSuitableSourcePaths,
} from '@/data-mapping/stml/extractPathsFromDocument';
import {
  DATA_MAPPING_EXAMPLE_CONFIG,
  DATA_MAPPING_SCHEMA,
} from '@/data-mapping/stml/dataMappingSchema';
import type {DataMappingConfig} from '@/data-mapping/stml/dataMappingTypes';
import {
  normalizeInputConfig,
  performSimpleDataMapping,
} from '@/data-mapping/stml/performDataMapping';
import {ValidationService} from '@/schema/validationService';
import {getBackendPreprocessedInputForAi} from '@/data-mapping/getBackendPreprocessedInputForAi';

export class DataMappingServiceStml implements DataMappingService {
  async generateMappingSuggestion(
    input: any,
    targetSchema: TopLevelSchema,
    userComments: string
  ): Promise<{config: string; success: boolean; message: string}> {
    const preview = await getBackendPreprocessedInputForAi(input, 'json');
    const inputDataSubset = preview.inputPreview;
    const inputFileSchema = inferJsonSchema(inputDataSubset);
    const apiKey = getApiKey();
    const possibleSourcePaths = extractSuitableSourcePaths(input);

    const responseStr = await queryDataMappingConfig(
      apiKey,
      JSON.stringify(DATA_MAPPING_SCHEMA),
      JSON.stringify(DATA_MAPPING_EXAMPLE_CONFIG),
      JSON.stringify(inputFileSchema),
      JSON.stringify(targetSchema),
      JSON.stringify(inputDataSubset),
      possibleSourcePaths,
      [
        preview.backendDisplayText ? `Backend preview: ${preview.backendDisplayText}` : '',
        preview.backendPromptHint ? `Backend parser guidance: ${preview.backendPromptHint}` : '',
        userComments,
      ]
        .filter(item => item.length > 0)
        .join('\n\n')
    );

    try {
      return {
        config: this.sanitizeMappingConfig(responseStr, input),
        success: true,
        message: 'Data mapping suggestion generated successfully.',
      };
    } catch (e: any) {
      return {
        config: responseStr,
        success: false,
        message: 'Error sanitizing data mapping suggestion: ' + (e?.message ?? String(e)),
      };
    }
  }

  async performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}> {
    try {
      const mapping = JSON.parse(config) as DataMappingConfig;
      const result = performSimpleDataMapping(input, mapping);
      return {
        resultData: result,
        success: true,
        message: 'Data mapping performed successfully.',
      };
    } catch (e: any) {
      return {
        resultData: {},
        success: false,
        message: 'Error performing data mapping: ' + (e?.message ?? String(e)),
      };
    }
  }

  sanitizeInputDocument(input: any): any {
    return input;
  }

  sanitizeMappingConfig(config: string, input: any): string {
    const configObj = fixAndParseGeneratedJson(config);
    const configValidated = configObj as DataMappingConfig;
    normalizeInputConfig(configValidated);

    const invalidUsedSourcePaths = extractInvalidSourcePathsFromConfig(configValidated, input);
    configValidated.mappings = configValidated.mappings.filter(
      mapping => !invalidUsedSourcePaths.includes(mapping.sourcePath)
    );

    return JSON.stringify(configValidated, null, 2);
  }

  validateMappingConfig(config: string, _input: any): {success: boolean; message: string} {
    const configSchemaValidator = new ValidationService(DATA_MAPPING_SCHEMA);

    let configJson: any;
    try {
      configJson = JSON.parse(config);
    } catch (_error) {
      return {
        success: false,
        message:
          'The data mapping configuration is not valid JSON. Please check the syntax and try again.',
      };
    }

    const configValidationResult = configSchemaValidator.validate(configJson);
    if (configValidationResult.errors.length > 0) {
      const formattedErrors = configValidationResult.errors
        .map(error => {
          return (
            '' +
            error.message +
            ' at path "' +
            error.instancePath +
            '" (schema path: "' +
            error.schemaPath +
            '").'
          );
        })
        .join('\n ');
      return {
        success: false,
        message: `The data mapping configuration is invalid: ${formattedErrors}`,
      };
    }

    return {success: true, message: 'The data mapping configuration is valid.'};
  }
}
