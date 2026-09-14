import {describe, expect, it, vi} from 'vitest';

async function setupDataMappingAi() {
  vi.resetModules();

  const canQueryAiMock = vi.fn(() => true);
  const getApiKeyMock = vi.fn(() => 'test-api-key');
  const queryOpenAiMock = vi.fn();

  vi.doMock('@/components/panels/ai-prompts/aiPromptUtils', async () => {
    const actual = await vi.importActual<
      typeof import('@/components/panels/ai-prompts/aiPromptUtils')
    >('@/components/panels/ai-prompts/aiPromptUtils');
    return {...actual, getApiKey: getApiKeyMock};
  });
  vi.doMock('@/utility/ai/aiAvailability', async () => {
    const actual = await vi.importActual<typeof import('@/utility/ai/aiAvailability')>(
      '@/utility/ai/aiAvailability'
    );
    return {...actual, canQueryAi: canQueryAiMock};
  });
  vi.doMock('@/utility/ai/aiEndpoint', () => ({queryOpenAI: queryOpenAiMock}));
  vi.doMock('@/utility/trimData', () => ({trimDataToMaxSize: (value: unknown) => value}));

  const dataMappingAi = await import('@/data-mapping/dataMappingAi');
  const {AI_ACCESS_UNAVAILABLE_MESSAGE} = await import('@/utility/ai/aiAvailability');
  return {
    ...dataMappingAi,
    AI_ACCESS_UNAVAILABLE_MESSAGE,
    canQueryAiMock,
    queryOpenAiMock,
  };
}

describe('data mapping AI', () => {
  it('builds one JavaScript prompt from source data, optional schema, hints, and retry context', async () => {
    const {generateMappingFunctionSuggestion, queryOpenAiMock} = await setupDataMappingAi();
    queryOpenAiMock.mockResolvedValue(
      '```javascript\nfunction transform(input) { return input; }\n```'
    );

    const result = await generateMappingFunctionSuggestion({
      language: 'javascript',
      method: 'source-data',
      inputData: {first_name: 'Ada'},
      inputDataSchema: {type: 'object'},
      targetSchema: {type: 'object', properties: {fullName: {type: 'string'}}},
      userComments: ' Combine the names. ',
      retryContext: {
        validationError: 'fullName is required',
        previousCode: 'function transform() { return {}; }',
      },
    });

    expect(result).toEqual({
      config: 'function transform(input) { return input; }',
      success: true,
      message: 'JavaScript mapping generated from source data and target schema.',
    });
    expect(queryOpenAiMock).toHaveBeenCalledTimes(1);
    const messages = queryOpenAiMock.mock.calls[0]![1];
    expect(messages[0].content).toContain('function transform(input)');
    expect(messages[1].content).toContain('REAL INPUT DATA SUBSET\n{"first_name":"Ada"}');
    expect(messages[1].content).toContain('REAL INPUT DATA SCHEMA\n{"type":"object"}');
    expect(messages[1].content).toContain('USER HINTS\nCombine the names.');
    expect(messages[1].content).toContain('RETRY CONTEXT');
    expect(messages[1].content).toContain('fullName is required');
  });

  it('builds a JSONata prompt from an inferred source schema', async () => {
    const {generateMappingFunctionSuggestion, queryOpenAiMock} = await setupDataMappingAi();
    queryOpenAiMock.mockResolvedValue('```jsonata\n{"name": name}\n```');

    const result = await generateMappingFunctionSuggestion({
      language: 'jsonata',
      method: 'inferred-source-schema',
      sourceSchema: {type: 'object', properties: {name: {type: 'string'}}},
      targetSchema: {type: 'object', properties: {name: {type: 'string'}}},
      userComments: '',
    });

    expect(result.config).toBe('{"name": name}');
    const userMessage = queryOpenAiMock.mock.calls[0]![1][1].content;
    expect(userMessage).toContain('SOURCE INPUT SCHEMA');
    expect(userMessage).not.toContain('REAL INPUT DATA SUBSET');
    expect(userMessage).not.toContain('USER HINTS');
  });

  it('returns the shared unavailable message without querying the AI endpoint', async () => {
    const {
      generateMappingFunctionSuggestion,
      AI_ACCESS_UNAVAILABLE_MESSAGE,
      canQueryAiMock,
      queryOpenAiMock,
    } = await setupDataMappingAi();
    canQueryAiMock.mockReturnValue(false);

    const result = await generateMappingFunctionSuggestion({
      language: 'jsonata',
      method: 'source-data',
      inputData: {name: 'Ada'},
      targetSchema: {type: 'object'},
      userComments: '',
    });

    expect(result).toEqual({
      config: '',
      success: false,
      message: AI_ACCESS_UNAVAILABLE_MESSAGE,
    });
    expect(queryOpenAiMock).not.toHaveBeenCalled();
  });

  it('reports an empty generated mapping as a failure', async () => {
    const {generateMappingFunctionSuggestion, queryOpenAiMock} = await setupDataMappingAi();
    queryOpenAiMock.mockResolvedValue('  ');

    const result = await generateMappingFunctionSuggestion({
      language: 'javascript',
      method: 'source-data',
      inputData: {name: 'Ada'},
      targetSchema: {type: 'object'},
      userComments: '',
    });

    expect(result.success).toBe(false);
    expect(result.config).toBe('');
    expect(result.message).toContain('The AI returned an empty mapping configuration.');
  });

  it('parses a direct AI mapping result and includes trimmed user hints', async () => {
    const {performDirectAiTargetSchemaMapping, queryOpenAiMock} = await setupDataMappingAi();
    queryOpenAiMock.mockResolvedValue('```json\n{"fullName":"Ada Lovelace"}\n```');

    const result = await performDirectAiTargetSchemaMapping(
      {firstName: 'Ada'},
      {type: 'object', properties: {fullName: {type: 'string'}}},
      ' Use a full name. '
    );

    expect(result.resultData).toEqual({fullName: 'Ada Lovelace'});
    const userMessage = queryOpenAiMock.mock.calls[0]![1][1].content;
    expect(userMessage).toContain('USER HINTS\nUse a full name.');
  });
});
