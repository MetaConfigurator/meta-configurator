import type {RmlMappingService} from '@/rml-mapping/rmlMappingService';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {queryRmlMapping} from '@/utility/ai/aiEndpoint';
import {
  RML_INSTRUCTIONS,
  RML_INPUT_EXAMPLE,
  RML_OUTPUT_EXAMPLE,
} from '@/rml-mapping/standard/rmlExamples';
import {trimDataToMaxSize} from '@/utility/trimData';
import * as RmlMapper from '@comake/rmlmapper-js';
import {Parser as N3Parser} from 'n3';
import jsonld from 'jsonld';

const IGNORED_PREFIX_NAMES = new Set(['rr', 'rml', 'ql']);

const IGNORED_IRIS = new Set([
  'http://www.w3.org/ns/r2rml#',
  'http://semweb.mmlab.be/ns/rml#',
  'http://semweb.mmlab.be/ns/ql#',
]);

const RML_MAPPER_OPTIONS = {toRDF: true, replace: false};

const RML_SPEC_URL = 'https://rml.io/specs/rml/';

function buildErrorMessage(reason: string): string {
  return (
    `Data mapping failed. Please check the mapping configuration. ` +
    `Use <a href="${RML_SPEC_URL}" target="_blank">${RML_SPEC_URL}</a> ` +
    `to validate and fix your RML expression. Reason: ${reason}.`
  );
}

function logInputSizeReduction(original: any, reduced: any): void {
  const originalKb = (JSON.stringify(original).length / 1024).toFixed(2);
  const reducedKb = (JSON.stringify(reduced).length / 1024).toFixed(2);
  console.log(`Reduced input data from ${originalKb} KB to ${reducedKb} KB`);
}

function logPromptSizes(inputExample: string, outputExample: string, inputSubset: string): void {
  const exampleKb = ((inputExample.length + outputExample.length) / 1024).toFixed(2);
  const subsetKb = (inputSubset.length / 1024).toFixed(2);
  console.log(
    `Sizes of the different input files in KB:` +
      ` rml example files: ${exampleKb}` +
      ` inputDataSubset: ${subsetKb}`
  );
}

function isErrorWithLine(error: unknown): error is {message: string; context: {line: number}} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    typeof (error as any).context === 'object' &&
    'line' in (error as any).context
  );
}

async function extractPrefixes(config: string): Promise<Record<string, string>> {
  let prefixes: Record<string, string> = {};

  await new N3Parser().parse(
    config,
    (_error: any, _quad: any, prefixMap: Record<string, string>) => {
      if (prefixMap) {
        prefixes = Object.fromEntries(
          Object.entries(prefixMap).filter(
            ([name, iri]) => !IGNORED_PREFIX_NAMES.has(name) && !IGNORED_IRIS.has(iri)
          )
        );
      }
    }
  );

  return prefixes;
}

async function convertRdfToJsonLd(rdfResult: any, prefixes: Record<string, string>): Promise<any> {
  const expanded = await jsonld.fromRDF(rdfResult, {format: 'application/n-quads'});
  return jsonld.compact(expanded, {'@context': prefixes});
}

function convertLineToCursorPosition(text: string, line: number): {row: number; column: number} {
  const lines = text.split('\n');
  let row = 0;
  let column = line;

  for (let i = 0; i < lines.length; i++) {
    if (column < lines[i]!.length) {
      row = i;
      break;
    }
    column -= lines[i]!.length + 1;
  }

  return {row, column};
}

function extractSingleRmlSourceFile(config: string): string {
  const sourceRegex = /rml:source\s+"((?:\\"|[^"])*)"/g;
  const sources = new Set<string>();

  for (const match of config.matchAll(sourceRegex)) {
    const rawSource = match[1] ?? '';
    const normalizedSource = rawSource.replace(/\\"/g, '"').trim();
    if (normalizedSource) {
      sources.add(normalizedSource);
    }
  }

  if (sources.size === 0) {
    throw new Error('No rml:source "<file>" was found in the mapping configuration');
  }

  if (sources.size > 1) {
    throw new Error(
      `Multiple different rml:source files found (${Array.from(sources).join(', ')}). ` +
        `Only one source file is supported`
    );
  }

  return Array.from(sources)[0]!;
}

export class RmlMappingServiceStandard implements RmlMappingService {
  async generateMappingSuggestion(
    input: any,
    userComments: string
  ): Promise<{config: string; success: boolean; message: string}> {
    const inputSubset = trimDataToMaxSize(input);
    logInputSizeReduction(input, inputSubset);

    const [inputExampleStr, outputExampleStr, inputSubsetStr] = [
      JSON.stringify(RML_INPUT_EXAMPLE),
      JSON.stringify(RML_OUTPUT_EXAMPLE),
      JSON.stringify(inputSubset),
    ];
    logPromptSizes(inputExampleStr, outputExampleStr, inputSubsetStr);

    const responseStr = await queryRmlMapping(
      getApiKey(),
      RML_INSTRUCTIONS,
      inputExampleStr,
      outputExampleStr,
      inputSubsetStr,
      userComments
    );

    try {
      return {
        config: fixGeneratedExpression(responseStr, ['turtle']),
        success: true,
        message: 'Data mapping suggestion generated successfully.',
      };
    } catch (e) {
      console.error('Error generating mapping suggestion:', e);
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
      const sourceFileName = extractSingleRmlSourceFile(config);
      const inputFiles = {[sourceFileName]: JSON.stringify(input)};
      const prefixes = await extractPrefixes(config);
      const rdfResult = await RmlMapper.parseTurtle(config, inputFiles, RML_MAPPER_OPTIONS);
      const resultData = await convertRdfToJsonLd(rdfResult, prefixes);

      return {resultData, success: true, message: 'Data mapping performed successfully.'};
    } catch (e: any) {
      console.error('Error performing data mapping:', e);
      return {
        resultData: {},
        success: false,
        message: buildErrorMessage(e.message),
      };
    }
  }

  validateMappingConfig(config: string): {success: boolean; message: string} {
    try {
      new N3Parser().parse(config);
      return {success: true, message: 'Mapping configuration is valid.'};
    } catch (error) {
      if (isErrorWithLine(error)) {
        const {row} = convertLineToCursorPosition(config, error.context.line);
        return {
          success: false,
          message: `Error reason: ${error.message} (row ${row}).`,
        };
      }

      return {success: false, message: 'Unknown error'};
    }
  }
}
