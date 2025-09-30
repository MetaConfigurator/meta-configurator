import type {DataExportService} from '@/utility/data-export/dataExportService';
import Handlebars from 'handlebars';
import {trimDataToMaxSize} from '@/utility/trimData';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryHandlebarsTemplate} from '@/utility/ai/aiEndpoint';
import {
  HANDLEBARS_INPUT_EXAMPLE,
  HANDLEBARS_INPUT_SCHEMA,
  HANDLEBARS_MAPPING_EXAMPLE,
  HANDLEBARS_OUTPUT_EXAMPLE,
} from '@/utility/data-export/handlebarsExamples';

Handlebars.registerHelper('default', (value: any, defaultValue: any) =>
  value !== undefined && value !== null && value !== '' ? value : defaultValue
);

Handlebars.registerHelper('exists', function (value: any, options: any) {
  const currentContext: any = this;
  return value !== undefined && value !== null && value !== ''
    ? options.fn(currentContext)
    : options.inverse(currentContext);
});

Handlebars.registerHelper(
  'compare',
  function (left: any, operator: string, right: any, options: any) {
    const currentContext: any = this;
    let result = false;
    switch (operator) {
      case '==':
        result = left == right;
        break;
      case '===':
        result = left === right;
        break;
      case '!=':
        result = left != right;
        break;
      case '!==':
        result = left !== right;
        break;
      case '<':
        result = left < right;
        break;
      case '<=':
        result = left <= right;
        break;
      case '>':
        result = left > right;
        break;
      case '>=':
        result = left >= right;
        break;
      default:
        throw new Error('Unknown operator ' + operator);
    }
    return result ? options.fn(currentContext) : options.inverse(currentContext);
  }
);

export class DataExportServiceHandlebars implements DataExportService {
  async generateMappingSuggestion(
    input: any,
    inputSchema: any,
    outputDescription: string
  ): Promise<{config: string; success: boolean; message: string}> {
    const inputDataSubset = trimDataToMaxSize(input);
    console.log(
      'Reduced input data from ' +
        JSON.stringify(input).length / 1024 +
        ' KB to ' +
        JSON.stringify(inputDataSubset).length / 1024 +
        ' KB'
    );

    // if no input schema provided, infer schema for input data
    if (!inputSchema || Object.keys(inputSchema).length === 0) {
      inputSchema = inferJsonSchema(inputDataSubset);
    }
    const apiKey = getApiKey();

    const inputFileSchemaStr = JSON.stringify(inputSchema);
    const inputDataSubsetStr = JSON.stringify(inputDataSubset);
    const resultPromise = queryHandlebarsTemplate(
      apiKey,
      HANDLEBARS_INPUT_EXAMPLE,
      HANDLEBARS_INPUT_SCHEMA,
      HANDLEBARS_OUTPUT_EXAMPLE,
      HANDLEBARS_MAPPING_EXAMPLE,
      inputDataSubsetStr,
      inputFileSchemaStr,
      outputDescription
    );

    const responseStr = await resultPromise;

    try {
      const fixedExpression = fixGeneratedExpression(responseStr, ['handlebars', 'json']);
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
      const compiled = Handlebars.compile(config);
      const result = compiled(input);
      return {
        resultData: result,
        success: true,
        message: 'Data export performed successfully.',
      };
    } catch (err: any) {
      console.error('Error performing data export: ', err);
      return {
        resultData: null,
        success: false,
        message: 'Template Error: ' + err.message,
      };
    }
  }
}
