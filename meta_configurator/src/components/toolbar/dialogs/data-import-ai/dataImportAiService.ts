import type {TopLevelSchema} from '@/schema/jsonSchemaType';
import {cloneDeep} from 'lodash';
import {fixGeneratedExpression, getApiKey} from '@/components/panels/ai-prompts/aiPromptUtils';
import {
  queryDataConversionToJson,
  queryJavascriptImportExpression,
  queryOpenAI,
} from '@/utility/ai/aiEndpoint';
import {ValidationService} from '@/schema/validationService';
import {
  detectFormatAndParseWithFormatProcessing,
  type FormatProcessingDetectionResult,
} from '@/utility/backend/formatProcessingApi';
import {makeJsonCompatible} from '@/utility/jsonCompatible';
import {generateJavascriptSchemaMappingSuggestion} from '@/data-mapping/javascript/generateJavascriptSchemaMappingSuggestion';

export type DataImportAiSchemaSource = 'infer_from_data' | 'use_current_schema';
export type DataImportAiRetryContext = {
  validationError: string;
  previousScript: string;
};

export type DataImportAiGenerationContext = {
  inputFileName: string;
  inputFileType: string;
  inputDocument: string;
  userComments: string;
  schemaSource: DataImportAiSchemaSource;
  targetSchema?: TopLevelSchema;
  promptHints: {
    noSchemaInstruction: string;
    dynamicImportInstruction: string;
    backendPromptInstruction: string;
    backendDisplayText: string;
  };
};

export type DataImportExecutionResult = {
  resultData: unknown;
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
  warningMessage?: string;
  confirmedMessage?: string;
};

export class DataImportAiService {
  private readonly maxSubsetChars = 12000;
  private readonly moduleCdnBaseUrl = 'https://esm.sh/';

  sanitizeInputDocument(input: string): string {
    return input;
  }

  sanitizeGeneratedScript(config: string): string {
    return config
      .replace(/```(javascript|js)?/gi, '')
      .replace(/```/g, '')
      .trim();
  }

  async detectFormatAndParseInBackend(
    fileName: string,
    fileType: string,
    inputDocument: string
  ): Promise<FormatProcessingDetectionResult> {
    try {
      return await detectFormatAndParseWithFormatProcessing(fileName, fileType, inputDocument);
    } catch (_error: any) {
      return {
        recognized: false,
        format: 'unknown',
        parsed_json: null,
        preprocessed_for_ai: null,
        message: 'Backend format detection unavailable. Falling back to AI mapping.',
        display_text: 'Backend format detection unavailable. Falling back to AI mapping.',
        parser_name: null,
        ai_prompt_hint: '',
      };
    }
  }

  async validateGeneratedScript(
    config: string,
    sampleInput: unknown
  ): Promise<{success: boolean; message: string}> {
    try {
      const sanitizedConfig = this.sanitizeGeneratedScript(config);
      const transformFn = await this.compileTransformFunction(sanitizedConfig);
      const rawResult = await Promise.resolve(transformFn(sampleInput));
      this.normalizeResult(rawResult);
      return {success: true, message: 'Generated JavaScript is valid.'};
    } catch (e: any) {
      return {success: false, message: `Error: ${e?.message ?? String(e)}`};
    }
  }

  async generateSuggestion(
    fileName: string,
    fileType: string,
    inputDocument: string,
    userComments: string,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined,
    backendDisplayText: string,
    backendPromptHint: string,
    retryContext?: DataImportAiRetryContext
  ): Promise<{config: string; success: boolean; message: string}> {
    const contextResult = this.buildGenerationContext(
      fileName,
      fileType,
      inputDocument,
      userComments,
      schemaSource,
      currentSchema,
      backendDisplayText,
      backendPromptHint
    );
    if (!contextResult.success || !contextResult.context) {
      return {
        config: '',
        success: false,
        message: contextResult.message,
      };
    }

    const context = contextResult.context;
    const inputSubset = context.inputDocument.slice(0, this.maxSubsetChars);
    const apiKey = getApiKey();
    const targetSchemaStr = context.targetSchema ? JSON.stringify(context.targetSchema) : undefined;
    const retryHints = this.buildRetryHints(retryContext);
    const combinedUserComments = [
      context.promptHints.backendDisplayText
        ? `Backend detection: ${context.promptHints.backendDisplayText}`
        : '',
      context.promptHints.backendPromptInstruction,
      context.userComments,
      retryHints,
    ]
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .join('\n\n');

    try {
      const responseStr = await queryJavascriptImportExpression(
        apiKey,
        context.inputFileName || 'uploaded-file',
        context.inputFileType || '',
        inputSubset,
        targetSchemaStr,
        combinedUserComments,
        context.schemaSource === 'infer_from_data',
        context.promptHints.dynamicImportInstruction
      );
      const fixed = fixGeneratedExpression(responseStr, ['javascript', 'js']);
      return {
        config: fixed,
        success: true,
        message: contextResult.message,
      };
    } catch (e: any) {
      return {
        config: '',
        success: false,
        message: `Failed to generate JavaScript parser. Reason: ${e?.message ?? String(e)}.`,
      };
    }
  }

  async generateNormalizationSuggestionFromParsedData(
    parsedData: unknown,
    preprocessedForAi: unknown,
    userComments: string,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined,
    backendDisplayText: string,
    backendPromptHint: string
  ): Promise<{config: string; success: boolean; message: string}> {
    try {
      if (schemaSource === 'use_current_schema' && currentSchema) {
        return generateJavascriptSchemaMappingSuggestion(
          preprocessedForAi ?? parsedData,
          currentSchema,
          userComments,
          undefined,
          backendDisplayText,
          backendPromptHint
        );
      }

      const apiKey = getApiKey();
      if (!apiKey || apiKey.trim().length === 0) {
        return {
          config: '',
          success: false,
          message: 'Missing API key. Please set your API key first.',
        };
      }

      const promptPreviewObject = this.buildPromptPreviewObject(preprocessedForAi ?? parsedData);
      const promptPreview = JSON.stringify(promptPreviewObject, null, 2);
      const targetSchemaString =
        schemaSource === 'use_current_schema' && currentSchema
          ? JSON.stringify(currentSchema)
          : undefined;
      const systemMessage = [
        'You are a JavaScript data normalization expert.',
        'Generate JavaScript code only, no markdown.',
        'The code must define: function transform(input) { ... }',
        'Input is ALREADY PARSED JSON object/array (not raw text).',
        'Return a NEW normalized JSON object/array (do not just return input).',
        'Do not use import/require/external libraries.',
        '',
        'Normalization goals (high priority):',
        '1) Preserve all important information.',
        '2) Improve structure: break packed string blobs into structured objects/arrays when feasible.',
        '3) Normalize scalar types: convert numeric strings to numbers, "true"/"false" to booleans.',
        '4) Convert placeholders like "?", "", "undefined", "null", "-" to null when semantically empty.',
        '5) Keep units/labels as strings when needed; do not over-convert identifiers.',
        '6) For tabular blocks encoded in text (e.g., loop_ sections), parse rows into arrays of objects when possible.',
        '7) In STAR/MPIF loop blocks: lines starting with "_" after "loop_" are column names (variables), followed by data rows.',
        '',
        'Quality constraints:',
        '- The output must be valid JSON-compatible data.',
        '- Avoid destructive dropping of fields.',
        '- If unsure about a field, keep original value.',
      ].join('\n');

      const userParts = [
        backendDisplayText ? `Backend detection: ${backendDisplayText}` : '',
        backendPromptHint ? `Backend parser guidance: ${backendPromptHint}` : '',
        'Parsed JSON preview (truncated for prompt efficiency):',
        promptPreview,
        targetSchemaString ? `Target schema (must match):\n${targetSchemaString}` : '',
        'Please generate a robust transform(input) implementation with helper functions for scalar coercion and optional parsing of loop/table-like text fields.',
        userComments ? `User hints:\n${userComments}` : '',
      ].filter(part => part.length > 0);

      const responseStr = await queryOpenAI(apiKey, [
        {role: 'system', content: systemMessage},
        {role: 'user', content: userParts.join('\n\n')},
      ]);
      const fixed = fixGeneratedExpression(responseStr, ['javascript', 'js']);

      return {
        config: fixed,
        success: true,
        message: 'Generated AI normalization JavaScript from parsed backend data.',
      };
    } catch (e: any) {
      return {
        config: '',
        success: false,
        message: `Failed to generate AI normalization script. Reason: ${e?.message ?? String(e)}.`,
      };
    }
  }

  async performImport(
    inputDocument: unknown,
    config: string,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined
  ): Promise<DataImportExecutionResult> {
    try {
      const sanitizedConfig = this.sanitizeGeneratedScript(config);
      const transformFn = await this.compileTransformFunction(sanitizedConfig);
      const rawResult = await Promise.resolve(transformFn(inputDocument));
      return this.prepareImportResult(
        rawResult,
        schemaSource,
        currentSchema,
        'Imported JSON does not match current schema',
        'Data imported despite schema mismatch warning.',
        'Data imported successfully.'
      );
    } catch (e: any) {
      return {
        resultData: {},
        success: false,
        message: `Import failed. Reason: ${e?.message ?? String(e)}.`,
      };
    }
  }

  async performDirectImport(
    parsedData: unknown,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined
  ): Promise<DataImportExecutionResult> {
    try {
      return this.prepareImportResult(
        parsedData,
        schemaSource,
        currentSchema,
        'Parsed JSON does not match current schema',
        'Data imported via direct backend parsing despite schema mismatch warning.',
        'Data imported successfully via direct backend parsing.'
      );
    } catch (e: any) {
      return {
        resultData: {},
        success: false,
        message: `Direct parsing import failed. Reason: ${e?.message ?? String(e)}.`,
      };
    }
  }

  async performFullAiImport(
    inputDocument: string,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined,
    backendDisplayText: string,
    backendPromptHint: string,
    userComments: string
  ): Promise<DataImportExecutionResult> {
    try {
      const apiKey = getApiKey();
      if (!apiKey || apiKey.trim().length === 0) {
        return {
          resultData: {},
          success: false,
          message: 'Missing API key. Please set your API key first.',
        };
      }

      let aiResponse = '';
      if (schemaSource === 'use_current_schema') {
        if (!currentSchema || Object.keys(currentSchema).length === 0) {
          return {
            resultData: {},
            success: false,
            message: 'Current schema is empty. Switch schema source or load a schema first.',
          };
        }
        aiResponse = await queryDataConversionToJson(
          apiKey,
          inputDocument,
          JSON.stringify(currentSchema)
        );
      } else {
        const userPrompt = [
          backendDisplayText.length > 0 ? `Backend detection: ${backendDisplayText}` : '',
          backendPromptHint.length > 0 ? `Backend parser guidance: ${backendPromptHint}` : '',
          'Input document:',
          inputDocument,
          '',
          userComments.length > 0 ? `User hints: ${userComments}` : '',
        ]
          .filter(line => line.length > 0)
          .join('\n');

        aiResponse = await queryOpenAI(apiKey, [
          {
            role: 'system',
            content:
              'Convert the provided input to JSON. Return only valid JSON object or JSON array. Do not add explanation text. Preserve information conservatively.',
          },
          {role: 'user', content: userPrompt},
        ]);
      }

      const parsedFromAi = this.parseAiJsonResponse(aiResponse);
      return this.prepareImportResult(
        parsedFromAi,
        schemaSource,
        currentSchema,
        'AI-converted JSON does not match current schema',
        'Data imported via full AI conversion despite schema mismatch warning.',
        'Data imported successfully via full AI conversion.'
      );
    } catch (e: any) {
      return {
        resultData: {},
        success: false,
        message: `Full AI import failed. Reason: ${e?.message ?? String(e)}.`,
      };
    }
  }

  buildGenerationContext(
    fileName: string,
    fileType: string,
    inputDocument: string,
    userComments: string,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined,
    backendDisplayText: string,
    backendPromptHint: string
  ): {success: boolean; message: string; context?: DataImportAiGenerationContext} {
    const sanitizedInput = this.sanitizeInputDocument(inputDocument);
    const noSchemaInstruction =
      'If no schema is given, derive a suitable target structure from the uploaded data.';
    const dynamicImportInstruction =
      'When external libraries are needed, prefer library-based parsing via await importModule("package-or-url") inside transform. Bare package names are resolved via esm.sh.';

    if (schemaSource === 'use_current_schema') {
      if (!currentSchema || Object.keys(currentSchema).length === 0) {
        return {
          success: false,
          message: 'Current schema is empty. Switch schema source or load a schema first.',
        };
      }

      return {
        success: true,
        message: 'Generation context prepared with current app schema.',
        context: {
          inputFileName: fileName,
          inputFileType: fileType,
          inputDocument: sanitizedInput,
          userComments,
          schemaSource,
          targetSchema: cloneDeep(currentSchema),
          promptHints: {
            noSchemaInstruction,
            dynamicImportInstruction,
            backendPromptInstruction: backendPromptHint,
            backendDisplayText,
          },
        },
      };
    }

    return {
      success: true,
      message: 'Generation context prepared with schema inference from imported data.',
      context: {
        inputFileName: fileName,
        inputFileType: fileType,
        inputDocument: sanitizedInput,
        userComments,
        schemaSource,
        promptHints: {
          noSchemaInstruction,
          dynamicImportInstruction,
          backendPromptInstruction: backendPromptHint,
          backendDisplayText,
        },
      },
    };
  }

  prepareImportResult(
    rawResult: unknown,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined,
    mismatchPrefix: string,
    confirmedMessage: string,
    successMessage: string
  ): DataImportExecutionResult {
    const normalizedResult = this.normalizeResult(rawResult);
    const validationOutcome = this.validateResultForSchema(
      normalizedResult,
      schemaSource,
      currentSchema,
      mismatchPrefix,
      confirmedMessage
    );
    if (validationOutcome.earlyReturn) {
      return validationOutcome.earlyReturn;
    }

    return {
      resultData: validationOutcome.resultForReturn,
      success: true,
      message: successMessage,
    };
  }

  private async compileTransformFunction(
    code: string
  ): Promise<(input: unknown) => unknown | Promise<unknown>> {
    const importModule = this.importModule.bind(this);
    const transformedCode = this.rewriteStaticImports(code);
    const wrapper = `
"use strict";
${transformedCode}
if (typeof importModule !== "function") {
  throw new Error("Runtime helper importModule(specifier) is not available.");
}
if (typeof transform !== "function") {
  throw new Error("Mapping must define a function: transform(input).");
}
return transform;
`;
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
      ...args: string[]
    ) => (
      importModule: (specifier: string) => Promise<unknown>
    ) => Promise<(input: unknown) => unknown | Promise<unknown>>;
    const factory = new AsyncFunction('importModule', wrapper) as (
      importModule: (specifier: string) => Promise<unknown>
    ) => Promise<(input: unknown) => unknown | Promise<unknown>>;
    return factory(importModule);
  }

  private async importModule(specifier: string): Promise<unknown> {
    const resolvedSpecifier = this.resolveModuleSpecifier(specifier);
    return import(/* @vite-ignore */ resolvedSpecifier);
  }

  private resolveModuleSpecifier(specifier: string): string {
    if (typeof specifier !== 'string') {
      throw new Error('Module specifier must be a string.');
    }

    const normalizedSpecifier = specifier.trim();
    if (normalizedSpecifier.length === 0) {
      throw new Error('Module specifier must not be empty.');
    }

    if (normalizedSpecifier.startsWith('http://') || normalizedSpecifier.startsWith('https://')) {
      return normalizedSpecifier;
    }

    if (normalizedSpecifier.startsWith('.') || normalizedSpecifier.startsWith('/')) {
      return normalizedSpecifier;
    }

    if (!/^[A-Za-z0-9@/_\-.]+$/.test(normalizedSpecifier)) {
      throw new Error(
        `Invalid module specifier "${normalizedSpecifier}". Only npm package names and URLs are allowed.`
      );
    }

    return `${this.moduleCdnBaseUrl}${encodeURI(normalizedSpecifier)}`;
  }

  private rewriteStaticImports(code: string): string {
    const lines = code.split('\n');
    const importStatements: string[] = [];
    const otherStatements: string[] = [];
    let importIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import ')) {
        otherStatements.push(line);
        continue;
      }

      const sideEffectMatch = trimmed.match(/^import\s+['"]([^'"]+)['"]\s*;?$/);
      if (sideEffectMatch) {
        importStatements.push(`await importModule(${JSON.stringify(sideEffectMatch[1])});`);
        continue;
      }

      const fromMatch = trimmed.match(/^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?$/);
      if (!fromMatch) {
        otherStatements.push(line);
        continue;
      }

      importIndex += 1;
      const importClauseRaw = fromMatch[1];
      const moduleSpecifier = fromMatch[2];
      if (!importClauseRaw || !moduleSpecifier) {
        otherStatements.push(line);
        continue;
      }
      const importClause = importClauseRaw.trim();
      const moduleVarName = `__importedModule${importIndex}`;
      importStatements.push(
        `const ${moduleVarName} = await importModule(${JSON.stringify(moduleSpecifier)});`
      );

      if (importClause.startsWith('* as ')) {
        const namespaceName = importClause.substring(5).trim();
        importStatements.push(`const ${namespaceName} = ${moduleVarName};`);
        continue;
      }

      if (importClause.startsWith('{')) {
        importStatements.push(
          `const ${this.convertNamedImportClauseToDestructure(importClause)} = ${moduleVarName};`
        );
        continue;
      }

      const clauseParts = importClause.split(',');
      const defaultImportName = clauseParts[0]?.trim();
      if (defaultImportName) {
        importStatements.push(
          `const ${defaultImportName} = ${moduleVarName}.default ?? ${moduleVarName};`
        );
      }

      const trailingClause = clauseParts.slice(1).join(',').trim();
      if (trailingClause.startsWith('{')) {
        importStatements.push(
          `const ${this.convertNamedImportClauseToDestructure(trailingClause)} = ${moduleVarName};`
        );
      } else if (trailingClause.startsWith('* as ')) {
        const namespaceName = trailingClause.substring(5).trim();
        importStatements.push(`const ${namespaceName} = ${moduleVarName};`);
      }
    }

    return [...importStatements, ...otherStatements].join('\n');
  }

  private convertNamedImportClauseToDestructure(importClause: string): string {
    const normalized = importClause
      .trim()
      .replace(/\bas\b/g, ':')
      .replace(/\s+/g, ' ');
    return normalized.startsWith('{') ? normalized : `{${normalized}}`;
  }

  private buildRetryHints(retryContext?: DataImportAiRetryContext): string {
    if (!retryContext) {
      return '';
    }

    const validationError = retryContext.validationError.trim();
    const previousScript = this.sanitizeGeneratedScript(retryContext.previousScript);
    if (validationError.length === 0 || previousScript.length === 0) {
      return '';
    }

    return [
      'Previous parser attempt failed validation.',
      'Validation error:',
      validationError,
      'Previous parser code:',
      previousScript,
      'Generate an improved parser that fixes this error while still parsing the uploaded file.',
    ].join('\n');
  }

  private normalizeResult(result: unknown): unknown {
    if (typeof result === 'string') {
      const parsed = JSON.parse(result);
      const normalizedParsed = makeJsonCompatible(parsed);
      if (normalizedParsed === null || typeof normalizedParsed !== 'object') {
        throw new Error('Parser output must be a JSON object or array.');
      }
      return normalizedParsed;
    }
    const normalizedResult = makeJsonCompatible(result);
    if (normalizedResult === null || typeof normalizedResult !== 'object') {
      throw new Error('Parser output must be a JSON object or array.');
    }
    return normalizedResult;
  }

  private parseAiJsonResponse(raw: string): unknown {
    const trimmed = raw.trim();
    const withoutCodeFences = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    return JSON.parse(withoutCodeFences);
  }

  private validateResultForSchema(
    normalizedResult: unknown,
    schemaSource: DataImportAiSchemaSource,
    currentSchema: TopLevelSchema | undefined,
    mismatchPrefix: string,
    confirmedMessage: string
  ): {resultForReturn: unknown; earlyReturn?: DataImportExecutionResult} {
    if (schemaSource !== 'use_current_schema') {
      return {resultForReturn: normalizedResult};
    }

    if (!currentSchema || Object.keys(currentSchema).length === 0) {
      return {
        resultForReturn: normalizedResult,
        earlyReturn: {
          resultData: {},
          success: false,
          message: 'Current schema is empty. Switch schema source or load a schema first.',
        },
      };
    }

    const adaptedResult = this.adaptResultToSchemaRoot(normalizedResult, currentSchema);
    const validation = new ValidationService(currentSchema).validate(adaptedResult);
    if (validation.errors.length > 0) {
      const formattedErrors = validation.errors
        .slice(0, 5)
        .map(error => `${error.message} at "${error.instancePath}"`)
        .join('; ');
      return {
        resultForReturn: adaptedResult,
        earlyReturn: {
          resultData: adaptedResult,
          success: true,
          message: 'Schema mismatch detected. Click import again to continue anyway.',
          requiresConfirmation: true,
          warningMessage: `${mismatchPrefix}: ${formattedErrors}`,
          confirmedMessage,
        },
      };
    }

    return {resultForReturn: adaptedResult};
  }

  private buildPromptPreviewObject(value: unknown): unknown {
    const maxStringLen = 4000;

    if (typeof value === 'string') {
      if (value.length <= maxStringLen) {
        return value;
      }
      return `${value.slice(0, maxStringLen)}...[TRUNCATED_${value.length - maxStringLen}_CHARS]`;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.buildPromptPreviewObject(item));
    }

    if (value !== null && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        const isLongDataField =
          /(_data$|pxrd|spectrum|intensity|signal|raw)/i.test(key) && typeof val === 'string';
        if (isLongDataField && typeof val === 'string' && val.length > 400) {
          out[key] = `${val.slice(0, 400)}...[TRUNCATED_${val.length - 400}_CHARS]`;
        } else {
          out[key] = this.buildPromptPreviewObject(val);
        }
      }
      return out;
    }

    return value;
  }

  private adaptResultToSchemaRoot(result: unknown, schema: TopLevelSchema): unknown {
    const schemaObj = schema as any;
    const required = Array.isArray(schemaObj?.required)
      ? (schemaObj.required as unknown[])
          .filter(item => typeof item === 'string')
          .map(item => item as string)
      : [];
    const properties =
      schemaObj?.properties && typeof schemaObj.properties === 'object'
        ? (schemaObj.properties as Record<string, unknown>)
        : undefined;

    if (required.length !== 1 || !properties) {
      return result;
    }

    const rootKey = required[0];
    if (!rootKey || !(rootKey in properties)) {
      return result;
    }

    if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
      const obj = result as Record<string, unknown>;
      if (rootKey in obj) {
        return result;
      }
    }

    return {[rootKey]: result};
  }
}
