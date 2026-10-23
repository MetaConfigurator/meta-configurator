import {describe, expect, it, vi} from 'vitest';

async function setupDataImportAiService() {
  vi.resetModules();

  const queryOpenAiMock = vi.fn();
  const queryDataConversionToJsonMock = vi.fn();
  const generateMappingFunctionSuggestionMock = vi.fn();
  const executeSandboxedJavascriptTransformMock = vi.fn();
  const detectFormatAndParseWithFormatProcessingMock = vi.fn();

  vi.doMock('@/components/panels/ai-prompts/aiPromptUtils', async () => {
    const actual = await vi.importActual<
      typeof import('@/components/panels/ai-prompts/aiPromptUtils')
    >('@/components/panels/ai-prompts/aiPromptUtils');
    return {...actual, getApiKey: () => 'test-api-key'};
  });
  vi.doMock('@/utility/ai/aiAvailability', async () => {
    const actual = await vi.importActual<typeof import('@/utility/ai/aiAvailability')>(
      '@/utility/ai/aiAvailability'
    );
    return {...actual, canQueryAi: () => true};
  });
  vi.doMock('@/utility/ai/aiEndpoint', () => ({
    queryOpenAI: queryOpenAiMock,
    queryDataConversionToJson: queryDataConversionToJsonMock,
  }));
  vi.doMock('@/data-mapping/dataMappingAi', () => ({
    generateMappingFunctionSuggestion: generateMappingFunctionSuggestionMock,
  }));
  vi.doMock('@/utility/backend/formatProcessingApi', () => ({
    detectFormatAndParseWithFormatProcessing: detectFormatAndParseWithFormatProcessingMock,
  }));
  vi.doMock('@/utility/sandboxedJavascript', () => ({
    executeSandboxedJavascriptTransform: executeSandboxedJavascriptTransformMock,
  }));

  return {
    ...(await import('../dataImportAiService')),
    generateMappingFunctionSuggestionMock,
    queryDataConversionToJsonMock,
    queryOpenAiMock,
    executeSandboxedJavascriptTransformMock,
    detectFormatAndParseWithFormatProcessingMock,
  };
}

describe('data import AI service', () => {
  it('forwards parsed-data mapping context to the shared mapping generator', async () => {
    const {generateParsedDataMappingScriptSuggestion, generateMappingFunctionSuggestionMock} =
      await setupDataImportAiService();
    generateMappingFunctionSuggestionMock.mockResolvedValue({
      config: 'function transform(input) { return input; }',
      success: true,
      message: 'Generated mapping.',
    });
    const retryContext = {
      validationError: 'name is required',
      previousCode: 'function transform() { return {}; }',
    };

    await generateParsedDataMappingScriptSuggestion({
      parsedData: {firstName: 'Ada'},
      preprocessedDataForAi: {firstName: 'Ada'},
      userComments: 'Keep the original name as an alias.',
      schemaSource: 'use_current_schema',
      currentSchema: {type: 'object', properties: {name: {type: 'string'}}},
      backendDisplayText: '',
      backendPromptHint: '',
      retryContext,
    });

    expect(generateMappingFunctionSuggestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        retryContext,
        targetSchema: {type: 'object', properties: {name: {type: 'string'}}},
        userComments: 'Keep the original name as an alias.',
      })
    );
  });

  it('adapts an unwrapped result to a schema with one required root property', async () => {
    const {runDirectParsedImport} = await setupDataImportAiService();

    const result = await runDirectParsedImport([{name: 'Ada'}], 'use_current_schema', {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name'],
            properties: {name: {type: 'string'}},
          },
        },
      },
    });

    expect(result).toEqual({
      resultData: {items: [{name: 'Ada'}]},
      success: true,
      message: 'Data imported successfully via direct backend parsing.',
    });
  });

  it('rejects scalar parser output before it reaches the editor', async () => {
    const {runDirectParsedImport} = await setupDataImportAiService();

    const result = await runDirectParsedImport('42', 'infer_from_data', undefined);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Parser output must be a JSON object or array.');
  });

  it('generates a raw-input parser prompt with backend hints and the current schema', async () => {
    const {generateImportScriptSuggestion, queryOpenAiMock} = await setupDataImportAiService();
    queryOpenAiMock.mockResolvedValue(
      '```javascript\nfunction transform(input) { return {name: input}; }\n```'
    );
    const currentSchema = {
      type: 'object' as const,
      required: ['name'],
      properties: {name: {type: 'string' as const}},
    };

    const result = await generateImportScriptSuggestion({
      inputFileName: 'sample.properties',
      inputFileType: 'text/plain',
      inputDocument: 'name=Ada',
      userComments: 'Keep the original name.',
      schemaSource: 'use_current_schema',
      currentSchema,
      backendDisplayText: 'Backend recognized properties.',
      backendPromptHint: 'Input contains key-value pairs.',
    });

    expect(result.success).toBe(true);
    expect(result.config).toBe('function transform(input) { return {name: input}; }');
    const messages = queryOpenAiMock.mock.calls[0]![1];
    expect(messages[0].content).toContain('returned JSON MUST validate');
    expect(messages[1].content).toContain('Backend recognized properties.');
    expect(messages[1].content).toContain('Input contains key-value pairs.');
    expect(messages[1].content).toContain(JSON.stringify(currentSchema));
    expect(messages[1].content).toContain('Keep the original name.');
  });

  it('validates a generated script and rejects non-container results', async () => {
    const {validateGeneratedImportScript, executeSandboxedJavascriptTransformMock} =
      await setupDataImportAiService();
    executeSandboxedJavascriptTransformMock.mockResolvedValue(42);

    const result = await validateGeneratedImportScript(
      'function transform() { return 42; }',
      'sample'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Parser output must be a JSON object or array.');
  });

  it('returns a confirmation result when generated output violates the current schema', async () => {
    const {runImportWithGeneratedScript, executeSandboxedJavascriptTransformMock} =
      await setupDataImportAiService();
    executeSandboxedJavascriptTransformMock.mockResolvedValue({unexpected: true});

    const result = await runImportWithGeneratedScript(
      'name=Ada',
      'function transform() { return {unexpected: true}; }',
      'use_current_schema',
      {
        type: 'object',
        required: ['name'],
        properties: {name: {type: 'string'}},
      }
    );

    expect(result.success).toBe(true);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.warningMessage).toContain('must be string');
  });

  it('uses direct schema conversion for a full AI import with the current schema', async () => {
    const {runFullAiImport, queryDataConversionToJsonMock, queryOpenAiMock} =
      await setupDataImportAiService();
    const currentSchema = {
      type: 'object' as const,
      required: ['name'],
      properties: {name: {type: 'string' as const}},
    };
    queryDataConversionToJsonMock.mockResolvedValue('```json\n{"name":"Ada"}\n```');

    const result = await runFullAiImport({
      inputDocument: 'name=Ada',
      schemaSource: 'use_current_schema',
      currentSchema,
      backendDisplayText: 'Recognized dotenv.',
      backendPromptHint: 'Keep values as strings.',
      userComments: 'Treat name as the title.',
    });

    // The hints reach the LLM on the current-schema path just like on the inferred one.
    const [apiKey, userMessage, schemaArgument] = queryDataConversionToJsonMock.mock.calls[0]!;
    expect(apiKey).toBe('test-api-key');
    expect(schemaArgument).toBe(JSON.stringify(currentSchema));
    expect(userMessage).toContain('name=Ada');
    expect(userMessage).toContain('Recognized dotenv.');
    expect(userMessage).toContain('Keep values as strings.');
    expect(userMessage).toContain('Treat name as the title.');
    expect(queryOpenAiMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      resultData: {name: 'Ada'},
      success: true,
      message: 'Data imported successfully via full AI conversion.',
    });
  });

  it('reports why backend format detection failed instead of hiding the reason', async () => {
    const {detectFormatAndParseInBackend, detectFormatAndParseWithFormatProcessingMock} =
      await setupDataImportAiService();
    detectFormatAndParseWithFormatProcessingMock.mockRejectedValue(
      new Error('Input file too large')
    );

    await expect(
      detectFormatAndParseInBackend('sample.cif', 'chemical/x-cif', 'data_sample')
    ).rejects.toThrow('Input file too large');
  });
});
