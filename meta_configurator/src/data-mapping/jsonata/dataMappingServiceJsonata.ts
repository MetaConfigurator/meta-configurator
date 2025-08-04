import type {DataMappingService} from '@/data-mapping/dataMappingService';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryJsonataExpression} from '@/utility/ai/aiEndpoint';
import {
  JSONATA_EXPRESSION,
  JSONATA_INPUT_EXAMPLE,
  JSONATA_INPUT_EXAMPLE_SCHEMA,
  JSONATA_OUTPUT_EXAMPLE,
  JSONATA_OUTPUT_EXAMPLE_SCHEMA,
  JSONATA_REFERENCE_GUIDE,
} from '@/data-mapping/jsonata/jsonataExamples';
import jsonata from 'jsonata';
import {cloneDeep} from 'lodash';
import {trimDataToMaxSize} from '@/utility/trimData';

export class DataMappingServiceJsonata implements DataMappingService {
  async generateMappingSuggestion(
    input: any,
    targetSchema: TopLevelSchema,
    userComments: string
  ): Promise<{config: string; success: boolean; message: string}> {
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

    const jsonataReferenceStr = JSON.stringify(JSONATA_REFERENCE_GUIDE);
    const jsonataInputExampleStr = JSON.stringify(JSONATA_INPUT_EXAMPLE);
    const jsonataInputExampleSchemaStr = JSON.stringify(JSONATA_INPUT_EXAMPLE_SCHEMA);
    const jsonataExpressionStr = JSON.stringify(JSONATA_EXPRESSION);
    const jsonataOutputExampleStr = JSON.stringify(JSONATA_OUTPUT_EXAMPLE);
    const jsonataOutputExampleSchemaStr = JSON.stringify(JSONATA_OUTPUT_EXAMPLE_SCHEMA);
    const inputFileSchemaStr = JSON.stringify(inputFileSchema);
    const targetSchemaStr = JSON.stringify(targetSchema);
    const inputDataSubsetStr = JSON.stringify(inputDataSubset);
    console.log(
      'Sizes of the different input files in KB:' +
        ' jsonata example files: ' +
        (
          (jsonataReferenceStr.length +
            jsonataInputExampleStr.length +
            jsonataInputExampleSchemaStr.length +
            jsonataExpressionStr.length +
            jsonataOutputExampleStr.length +
            jsonataOutputExampleSchemaStr.length) /
          1024
        ).toFixed(2) +
        ' inputFileSchema: ' +
        (inputFileSchemaStr.length / 1024).toFixed(2) +
        ' targetSchema: ' +
        (targetSchemaStr.length / 1024).toFixed(2) +
        ' inputDataSubset: ' +
        (inputDataSubsetStr.length / 1024).toFixed(2)
    );
    const resultPromise = queryJsonataExpression(
      apiKey,
      jsonataReferenceStr,
      jsonataInputExampleStr,
      jsonataInputExampleSchemaStr,
      jsonataOutputExampleStr,
      jsonataOutputExampleSchemaStr,
      jsonataExpressionStr,
      inputDataSubsetStr,
      inputFileSchemaStr,
      targetSchemaStr,
      userComments
    );

    const responseStr = await resultPromise;

    try {
      const fixedExpression = fixGeneratedExpression(responseStr, ['jsonata', 'json']);
      return {
        config: fixedExpression,
        success: true,
        message: 'Data mapping suggestion generated successfully.',
      };
    } catch (e) {
      console.error('Error generating mapping suggestion: ', e);
      return {
        config: responseStr,
        success: false,
        message:
          'Failed to generate data mapping suggestion. Please check the console for more details.',
      };
    }
  }

  async performDataMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}> {
    try {
      const result = await jsonata(config).evaluate(input);
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
        message: `Data mapping failed. Please check the mapping configuration. Use <a href="https://try.jsonata.org/" target="_blank">https://try.jsonata.org/</a> to validate and fix your JSONata expression. Reason: ${e.message}.`,
      };
    }
  }

  sanitizeInputDocument(input: any): any {
    const result = cloneDeep(input);
    // loop through nested JSON object which could also have array as children and remove all special characters from property names
    this.removeSpecialCharactersRecursive(result);
    return result;
  }

  removeSpecialCharactersRecursive(data: any) {
    // TODO
  }

  sanitizeMappingConfig(config: string, input: any): string {
    return config; // TODO
  }

  validateMappingConfig(config: string, input: any): {success: boolean; message: string} {
    const inputDataSubset = trimDataToMaxSize(input);
    try {
      jsonata(config).evaluate(inputDataSubset);
      return {success: true, message: 'Mapping configuration is valid.'};
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'position' in error &&
        'code' in error &&
        'message' in error
      ) {
        const cursorPosition = this.convertTextPositionToCursorPosition(
          config,
          error.position as number
        );
        return {
          success: false,
          message: 'Error reason: ' + error.message + ' (row ' + (cursorPosition.row + 1) + ').',
        };
      } else {
        return {success: false, message: 'Unknown error'};
      }
    }
  }

  convertTextPositionToCursorPosition(
    text: string,
    position: number
  ): {row: number; column: number} {
    const lines = text.split('\n');
    let row = 0;
    let column = position;

    for (let i = 0; i < lines.length; i++) {
      if (column < lines[i].length) {
        row = i;
        break;
      }
      column -= lines[i].length + 1; // +1 for the newline character
    }

    return {row, column};
  }
}
