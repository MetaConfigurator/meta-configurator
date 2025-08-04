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
import * as console from 'node:console';
import {trimDataToMaxSize} from '@/utility/trimData';

export class DataMappingServiceStml implements DataMappingService {
  async generateMappingSuggestion(
    input: any,
    targetSchema: TopLevelSchema,
    userComments: string
  ): Promise<{config: string; success: boolean; message: string}> {
    console.log('input is: ', input);
    const inputDataSubset = trimDataToMaxSize(input);
    console.log(
      'Reduced input data from ' +
        JSON.stringify(input).length / 1024 +
        ' KB to ' +
        JSON.stringify(inputDataSubset).length / 1024 +
        ' KB'
    );

    // infer schema for input data
    const inputFileSchema = inferJsonSchema(inputDataSubset);
    const apiKey = getApiKey();
    const possibleSourcePaths = extractSuitableSourcePaths(input);

    const dataMappingSchemaStr = JSON.stringify(DATA_MAPPING_SCHEMA);
    const dataMappingExampleStr = JSON.stringify(DATA_MAPPING_EXAMPLE_CONFIG);
    const inputFileSchemaStr = JSON.stringify(inputFileSchema);
    const targetSchemaStr = JSON.stringify(targetSchema);
    const inputDataSubsetStr = JSON.stringify(inputDataSubset);
    console.log(
      'Sizes of the different input files in KB:' +
        ' dataMappingSchema: ' +
        (dataMappingSchemaStr.length / 1024).toFixed(2) +
        ' inputFileSchema: ' +
        (inputFileSchemaStr.length / 1024).toFixed(2) +
        ' targetSchema: ' +
        (targetSchemaStr.length / 1024).toFixed(2) +
        ' inputDataSubset: ' +
        (inputDataSubsetStr.length / 1024).toFixed(2)
    );
    const resultPromise = queryDataMappingConfig(
      apiKey,
      dataMappingSchemaStr,
      dataMappingExampleStr,
      inputFileSchemaStr,
      targetSchemaStr,
      inputDataSubsetStr,
      possibleSourcePaths,
      userComments
    );

    const responseStr = await resultPromise;
    try {
      const sanitizedConfig = this.sanitizeMappingConfig(responseStr, input);
      return {
        config: sanitizedConfig,
        success: true,
        message: 'Data mapping suggestion generated successfully.',
      };
    } catch (e) {
      console.error('Error sanitizing mapping config: ', e);
      return {
        config: responseStr,
        success: false,
        message: 'Error sanitizing data mapping suggestion: ' + e.message,
      };
    }
  }

  async performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}> {
    const mapping = JSON.parse(config) as DataMappingConfig;
    console.log('parsed mapping is: ', mapping);
    try {
      const result = performSimpleDataMapping(input, mapping);
      return {
        resultData: result,
        success: true,
        message: 'Data mapping performed successfully.',
      };
    } catch (e) {
      console.error('Error performing data mapping: ', e);
      return {
        resultData: {},
        success: false,
        message: 'Error performing data mapping: ' + e.message,
      };
    }
  }

  sanitizeInputDocument(input: any): any {
    return input;
  }

  sanitizeMappingConfig(config: string, input: any): string {
    const configObj = fixAndParseGeneratedJson(config);
    const configValidated: DataMappingConfig = configObj as DataMappingConfig;

    // normalize
    normalizeInputConfig(configObj);

    // remove invalid path mappings or transformations
    const invalidUsedSourcePaths = extractInvalidSourcePathsFromConfig(configValidated, input);
    if (invalidUsedSourcePaths.length > 0) {
      console.log(
        `The following source paths are not valid in the input file: ${invalidUsedSourcePaths.join(
          ', '
        )}. They will be removed from the configuration.`
      );
    }
    configValidated.mappings = configValidated.mappings.filter(mapping => {
      return !invalidUsedSourcePaths.includes(mapping.sourcePath);
    });

    return JSON.stringify(configObj, null, 2);
  }

  validateMappingConfig(config: string, input: any): {success: boolean; message: string} {
    const configSchemaValidator = new ValidationService(DATA_MAPPING_SCHEMA);

    let configJson: any;
    // parse config to JSON
    try {
      configJson = JSON.parse(config);
    } catch (e) {
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
      }; // TODO: automated error recovery
    }

    return {success: true, message: 'The data mapping configuration is valid.'};
  }
}
