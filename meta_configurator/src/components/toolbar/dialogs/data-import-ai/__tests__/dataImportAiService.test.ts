import {describe, expect, it, vi} from 'vitest';

async function setupDataImportAiService() {
  vi.resetModules();

  const queryOpenAiMock = vi.fn();
  const generateMappingFunctionSuggestionMock = vi.fn();

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
    queryDataConversionToJson: vi.fn(),
  }));
  vi.doMock('@/data-mapping/dataMappingAi', () => ({
    generateMappingFunctionSuggestion: generateMappingFunctionSuggestionMock,
  }));
  vi.doMock('@/utility/backend/formatProcessingApi', () => ({
    detectFormatAndParseWithFormatProcessing: vi.fn(),
  }));

  return {
    ...(await import('../dataImportAiService')),
    generateMappingFunctionSuggestionMock,
    queryOpenAiMock,
  };
}

describe('data import AI service', () => {
  it('includes a failed normalization script in the next generated prompt', async () => {
    const {generateNormalizationScriptSuggestion, queryOpenAiMock} =
      await setupDataImportAiService();
    queryOpenAiMock.mockResolvedValue('function transform(input) { return {...input}; }');

    await generateNormalizationScriptSuggestion({
      parsedData: {value: '1'},
      preprocessedDataForAi: {value: '1'},
      userComments: 'Convert numeric values.',
      schemaSource: 'infer_from_data',
      currentSchema: undefined,
      backendDisplayText: 'Backend recognized properties.',
      backendPromptHint: 'Input contains key-value pairs.',
      retryContext: {
        validationError: 'Parser output must be an object.',
        previousCode: 'function transform() { return 1; }',
      },
    });

    const userMessage = queryOpenAiMock.mock.calls[0]![1][1].content;
    expect(userMessage).toContain('Backend recognized properties.');
    expect(userMessage).toContain('Convert numeric values.');
    expect(userMessage).toContain('Parser output must be an object.');
    expect(userMessage).toContain('function transform() { return 1; }');
  });

  it('forwards normalization retry context to the shared mapping generator', async () => {
    const {generateNormalizationScriptSuggestion, generateMappingFunctionSuggestionMock} =
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

    await generateNormalizationScriptSuggestion({
      parsedData: {firstName: 'Ada'},
      preprocessedDataForAi: {firstName: 'Ada'},
      userComments: '',
      schemaSource: 'use_current_schema',
      currentSchema: {type: 'object', properties: {name: {type: 'string'}}},
      backendDisplayText: '',
      backendPromptHint: '',
      retryContext,
    });

    expect(generateMappingFunctionSuggestionMock).toHaveBeenCalledWith(
      expect.objectContaining({retryContext})
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
});
