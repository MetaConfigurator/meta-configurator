import type {RmlMappingService} from '@/rml-mapping/rmlMappingService';
import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {inferJsonSchema} from '@/schema/inferJsonSchema';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryRmlMapping} from '@/utility/ai/aiEndpoint';
import {
  RML_INPUT_EXAMPLE,
  RML_INPUT_EXAMPLE_SCHEMA,
  RML_OUTPUT_EXAMPLE,
} from '@/rml-mapping/standard/rmlExamples';
import {trimDataToMaxSize} from '@/utility/trimData';
import * as RmlMapper from '@comake/rmlmapper-js';
import {Parser as N3Parser} from 'n3';
import jsonld from 'jsonld';

const RML_ERROR_MESSAGE = (reason: string) => `
Data mapping failed. Please check the mapping configuration. 
Use <a href="https://rml.io/specs/rml/" target="_blank">https://rml.io/specs/rml/</a> 
to validate and fix your RML expression. Reason: ${reason}.
`;

const options = {
  toRDF: true,
  replace: false,
};

const ignoredPrefixNames = new Set(['rr', 'rml', 'ql']);

const ignoredIRIs = new Set([
  'http://www.w3.org/ns/r2rml#',
  'http://semweb.mmlab.be/ns/rml#',
  'http://semweb.mmlab.be/ns/ql#',
]);

export class RmlMappingServiceStandard implements RmlMappingService {
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

    const inputFileSchema = inferJsonSchema(inputDataSubset);
    const apiKey = getApiKey();

    const rmlInputExampleStr = JSON.stringify(RML_INPUT_EXAMPLE);
    const rmlInputExampleSchemaStr = JSON.stringify(RML_INPUT_EXAMPLE_SCHEMA);
    const rmlOutputExampleStr = JSON.stringify(RML_OUTPUT_EXAMPLE);
    const inputFileSchemaStr = JSON.stringify(inputFileSchema);
    const targetSchemaStr = JSON.stringify(targetSchema);
    const inputDataSubsetStr = JSON.stringify(inputDataSubset);

    console.log(
      'Sizes of the different input files in KB:' +
        ' rml example files: ' +
        (
          (rmlInputExampleStr.length +
            rmlInputExampleSchemaStr.length +
            rmlOutputExampleStr.length) /
          1024
        ).toFixed(2) +
        ' inputFileSchema: ' +
        (inputFileSchemaStr.length / 1024).toFixed(2) +
        ' targetSchema: ' +
        (targetSchemaStr.length / 1024).toFixed(2) +
        ' inputDataSubset: ' +
        (inputDataSubsetStr.length / 1024).toFixed(2)
    );

    const resultPromise = queryRmlMapping(
      apiKey,
      rmlInputExampleStr,
      rmlInputExampleSchemaStr,
      rmlOutputExampleStr,
      inputDataSubsetStr,
      inputFileSchemaStr,
      targetSchemaStr,
      userComments
    );

    const responseStr = await resultPromise;

    try {
      const fixedExpression = fixGeneratedExpression(responseStr, ['turtle']);
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

  async performRmlMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}> {
    try {
      const inputFiles = {
        'Data.json': `${JSON.stringify(input)}`,
      };

      let prefixes: Record<string, string> = {};

      new N3Parser().parse(config, (error: any, quads: any, prefixMap: Record<string, string>) => {
        if (prefixMap) {
          prefixes = Object.fromEntries(
            Object.entries(prefixMap).filter(([name, iri]) => {
              return !ignoredPrefixNames.has(name) && !ignoredIRIs.has(iri);
            })
          );
        }
      });

      const result = await RmlMapper.parseTurtle(config, inputFiles, options);

      const expanded = await jsonld.fromRDF(result, {
        format: 'application/n-quads',
      });

      const final_jsonld = await jsonld.compact(expanded, prefixes);

      return {
        resultData: final_jsonld,
        success: true,
        message: 'Data mapping performed successfully.',
      };
    } catch (e: any) {
      console.error('Error performing data mapping: ', e);
      return {
        resultData: {},
        success: false,
        message: RML_ERROR_MESSAGE(e.message),
      };
    }
  }

  validateMappingConfig(config: string, input: any): {success: boolean; message: string} {
    try {
      let _ = new N3Parser().parse(config);
      return {success: true, message: 'Mapping configuration is valid.'};
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'context' in error &&
        error.context &&
        typeof error.context === 'object' &&
        'line' in error.context
      ) {
        const cursorPosition = this.convertTextPositionToCursorPosition(
          config,
          error.context.line as number
        );
        return {
          success: false,
          message: 'Error reason: ' + error.message + ' (row ' + cursorPosition.row + ').',
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
      if (column < lines[i]!.length) {
        row = i;
        break;
      }
      column -= lines[i]!.length + 1;
    }

    return {row, column};
  }
}
