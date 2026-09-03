import {describe, expect, it, vi} from 'vitest';
import {nextTick, ref} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';
import {
  ButtonStub,
  CheckboxStub,
  createMockAceEditor,
  DialogStub,
  DividerStub,
  EmptyStub,
  findButtonByText,
  InputNumberStub,
  InputTextStub,
  MessageStub,
  type MockAceEditor,
  PanelStub,
  SelectStub,
  SlotStub,
  openDialog,
} from '@/components/toolbar/dialogs/__tests__/dialogTestUtils';

async function setupDialog({
  currentData,
  currentSchema,
  integrationPipeline,
}: {
  currentData: unknown;
  currentSchema: Record<string, unknown>;
  integrationPipeline?: {
    mockedAiResponse: string;
    executeGeneratedMapping: (source: string, input: unknown) => unknown;
  };
}) {
  vi.resetModules();

  const apiKeyRef = ref('test-key');
  const dataEditorData = ref<unknown>(currentData);
  const dataEditorSetDataMock = vi.fn((newData: unknown) => {
    dataEditorData.value = newData;
  });
  const schemaEditorSetDataMock = vi.fn();
  const toastAddMock = vi.fn();
  const onErrorMock = vi.fn();
  const queryOpenAIMock = vi.fn().mockResolvedValue(integrationPipeline?.mockedAiResponse);
  const executeSandboxedJavascriptTransformMock = vi.fn(
    async (source: string, input: unknown) =>
      integrationPipeline?.executeGeneratedMapping(source, input)
  );
  const generateMappingFunctionSuggestionMock = vi.fn();
  const performDirectAiTargetSchemaMappingMock = vi.fn();
  const validateJavascriptMappingMock = vi
    .fn()
    .mockResolvedValue({success: true, message: 'Mapping configuration is valid.'});
  const validateJsonataMappingMock = vi
    .fn()
    .mockResolvedValue({success: true, message: 'Mapping configuration is valid.'});
  const editors: MockAceEditor[] = [];
  const aceEditMock = vi.fn(() => {
    const editor = createMockAceEditor();
    editors.push(editor);
    return editor;
  });

  vi.doMock('primevue/dialog', () => ({default: DialogStub}));
  vi.doMock('primevue/button', () => ({default: ButtonStub}));
  vi.doMock('primevue/select', () => ({default: SelectStub}));
  vi.doMock('primevue/inputtext', () => ({default: InputTextStub}));
  vi.doMock('primevue/message', () => ({default: MessageStub}));
  vi.doMock('primevue/divider', () => ({default: DividerStub}));
  vi.doMock('primevue/checkbox', () => ({default: CheckboxStub}));
  vi.doMock('primevue/inputnumber', () => ({default: InputNumberStub}));
  vi.doMock('primevue/panel', () => ({default: PanelStub}));
  vi.doMock('@/components/panels/ai-prompts/ApiKey.vue', () => ({default: EmptyStub}));
  vi.doMock('@/components/panels/ai-prompts/ApiKeyWarning.vue', () => ({default: EmptyStub}));
  vi.doMock('@/components/panels/shared-components/PanelSettings.vue', () => ({default: SlotStub}));
  vi.doMock('@/components/panels/shared-components/aceUtils', () => ({
    // setupAceProperties returns the callback that stops its settings watchers.
    setupAceProperties: vi.fn(() => vi.fn()),
  }));
  vi.doMock('@/settings/useSettings', () => ({
    useSettings: () =>
      ref({
        textEditor: {tabSize: 2},
        performance: {
          maxDocumentSizeForSchemaInference: 10_000_000,
          minObjectPropertyCountToPreserve: 1000,
        },
        aiIntegration: {
          backend: {endpoint: 'https://api.openai.com/v1/'},
        },
      }),
  }));
  vi.doMock('@/utility/ai/apiKey', () => ({
    getApiKey: () => apiKeyRef.value,
    getApiKeyRef: () => apiKeyRef,
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: (mode: string) =>
      mode === 'dataEditor'
        ? {
            data: dataEditorData,
            setData: dataEditorSetDataMock,
          }
        : {
            data: ref(currentSchema),
            setData: schemaEditorSetDataMock,
          },
  }));
  vi.doMock('@/utility/toastService', () => ({toastService: {add: toastAddMock}}));
  vi.doMock('@/utility/errorServiceInstance', () => ({
    useErrorService: () => ({
      onError: (error: unknown) => {
        onErrorMock(error);
        throw error;
      },
    }),
  }));
  if (integrationPipeline) {
    vi.doUnmock('@/data-mapping/dataMappingAi');
    vi.doUnmock('@/data-mapping/javascript/dataMappingServiceJavascript');
    vi.doUnmock('@/data-mapping/jsonata/dataMappingServiceJsonata');
    vi.doMock('@/utility/ai/aiEndpoint', () => ({queryOpenAI: queryOpenAIMock}));
    vi.doMock('@/utility/sandboxedJavascript', () => ({
      executeSandboxedJavascriptTransform: executeSandboxedJavascriptTransformMock,
    }));
  } else {
    vi.doMock('@/data-mapping/dataMappingAi', () => ({
      generateMappingFunctionSuggestion: generateMappingFunctionSuggestionMock,
      performDirectAiTargetSchemaMapping: performDirectAiTargetSchemaMappingMock,
    }));
    vi.doMock('@/data-mapping/javascript/dataMappingServiceJavascript', () => ({
      DataMappingServiceJavascript: class {
        sanitizeInputDocument(inputData: unknown) {
          return inputData;
        }

        validateMappingConfig(mappingConfiguration: string, inputData: unknown) {
          return validateJavascriptMappingMock(mappingConfiguration, inputData);
        }
      },
    }));
    vi.doMock('@/data-mapping/jsonata/dataMappingServiceJsonata', () => ({
      DataMappingServiceJsonata: class {
        sanitizeInputDocument(inputData: unknown) {
          return inputData;
        }

        validateMappingConfig(mappingConfiguration: string, inputData: unknown) {
          return validateJsonataMappingMock(mappingConfiguration, inputData);
        }
      },
    }));
  }
  vi.doMock('brace', () => ({
    edit: aceEditMock,
  }));
  vi.doMock('brace/mode/javascript', () => ({}));
  vi.doMock('brace/mode/jsoniq', () => ({}));
  vi.doMock('brace/mode/text', () => ({}));

  const DataMappingDialog = (
    await import('@/components/toolbar/dialogs/data-mapping/DataMappingDialog.vue')
  ).default;

  const wrapper = mount(DataMappingDialog, {
    attachTo: document.body,
  });

  return {
    wrapper,
    dataEditorData,
    dataEditorSetDataMock,
    schemaEditorSetDataMock,
    toastAddMock,
    generateMappingFunctionSuggestionMock,
    performDirectAiTargetSchemaMappingMock,
    validateJavascriptMappingMock,
    validateJsonataMappingMock,
    queryOpenAIMock,
    executeSandboxedJavascriptTransformMock,
    editors,
  };
}

describe('DataMappingDialog', () => {
  it('shows collapsed source-schema inference options and defaults to JavaScript', async () => {
    const {wrapper} = await setupDialog({
      currentData: [{name: 'Alice'}, {name: 'Bob'}],
      currentSchema: {type: 'object'},
    });

    await openDialog(wrapper);
    expect(wrapper.find('[data-testid="source-schema-inference-options"]').exists()).toBe(false);
    expect((wrapper.findAll('select')[1]!.element as HTMLSelectElement).value).toBe('javascript');

    await wrapper.findAll('select')[0]!.setValue('inferred-source-schema');
    await flushPromises();

    const inferenceOptions = wrapper.get('[data-testid="source-schema-inference-options"]');
    expect(inferenceOptions.text()).toContain('Source Schema Inference Options');
    expect(inferenceOptions.attributes('data-collapsed')).toBe('true');
    expect(inferenceOptions.text()).toContain('Add Examples');
    expect(inferenceOptions.text()).toContain('Detect Enums');
    expect(inferenceOptions.text()).toContain('Detect Additional Properties');
    expect(
      (wrapper.get('#mapping-inferred-source-schema-add-examples').element as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      (wrapper.get('#mapping-inferred-source-schema-detect-enums').element as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      (
        wrapper.get('#mapping-inferred-source-schema-detect-additional-properties')
          .element as HTMLInputElement
      ).checked
    ).toBe(true);
  });

  it('uses the inferred and refined source schema without overwriting the current target schema', async () => {
    const currentSchema = {
      type: 'object',
      properties: {
        fullName: {type: 'string'},
      },
      required: ['fullName'],
    };
    const {wrapper, schemaEditorSetDataMock, generateMappingFunctionSuggestionMock} =
      await setupDialog({
        currentData: [
          {name: 'Alice', age: 30},
          {name: 'Bob', age: 41},
        ],
        currentSchema,
      });

    generateMappingFunctionSuggestionMock.mockResolvedValue({
      config: 'function transform(input) { return input; }',
      success: true,
      message: 'ok',
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[0]!.setValue('inferred-source-schema');
    await flushPromises();
    await wrapper.findAll('select')[1]!.setValue('javascript');
    await flushPromises();
    await wrapper.get('#mapping-inferred-source-schema-add-examples').setValue(true);
    await flushPromises();
    await findButtonByText(wrapper, 'Generate Suggestion').trigger('click');
    await flushPromises();

    expect(generateMappingFunctionSuggestionMock).toHaveBeenCalledTimes(1);
    const request = generateMappingFunctionSuggestionMock.mock.calls[0]![0];
    expect(request.method).toBe('inferred-source-schema');
    expect(request.language).toBe('javascript');
    expect(request.targetSchema).toEqual(currentSchema);
    expect(request.inputData).toBeUndefined();
    expect(request.sourceSchema.type).toBe('array');
    expect(request.sourceSchema.items.properties.name.examples).toEqual(['Alice', 'Bob']);
    expect(request.sourceSchema.items.properties.age.examples).toEqual([30, 41]);
    expect(schemaEditorSetDataMock).not.toHaveBeenCalled();
  });

  it('integrates inferred source-schema generation, validation, execution, and Data Editor storage', async () => {
    const currentData = {
      first_name: 'Ada',
      last_name: 'Lovelace',
    };
    const currentSchema = {
      type: 'object',
      properties: {
        fullName: {type: 'string'},
      },
      required: ['fullName'],
    };
    const generatedJavascript = [
      'function transform(input) {',
      "  return {fullName: input.first_name + ' ' + input.last_name};",
      '}',
    ].join('\n');
    const mockedAiResponse = `\`\`\`javascript\n${generatedJavascript}\n\`\`\``;
    const mappedData = {fullName: 'Ada Lovelace'};
    const {
      wrapper,
      dataEditorData,
      dataEditorSetDataMock,
      schemaEditorSetDataMock,
      queryOpenAIMock,
      executeSandboxedJavascriptTransformMock,
    } = await setupDialog({
      currentData,
      currentSchema,
      integrationPipeline: {
        mockedAiResponse,
        executeGeneratedMapping: (_source, input) => {
          const person = input as typeof currentData;
          return {fullName: `${person.first_name} ${person.last_name}`};
        },
      },
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[0]!.setValue('inferred-source-schema');
    await flushPromises();
    await findButtonByText(wrapper, 'Generate Suggestion').trigger('click');
    await flushPromises();

    expect(queryOpenAIMock).toHaveBeenCalledOnce();
    const aiMessages = queryOpenAIMock.mock.calls[0]![1] as {role: string; content: string}[];
    const userMessage = aiMessages[1]!.content;
    expect(userMessage).toContain('SOURCE INPUT SCHEMA');
    expect(userMessage).toContain('"first_name"');
    expect(userMessage).toContain('"examples":["Ada"]');
    expect(userMessage).toContain('TARGET OUTPUT SCHEMA');
    expect(userMessage).toContain('"fullName"');
    expect(userMessage).not.toContain('REAL INPUT DATA SUBSET');
    expect(executeSandboxedJavascriptTransformMock).toHaveBeenCalledWith(
      generatedJavascript,
      currentData
    );

    await findButtonByText(wrapper, 'Perform Mapping').trigger('click');
    await flushPromises();

    expect(executeSandboxedJavascriptTransformMock).toHaveBeenCalledTimes(2);
    expect(dataEditorSetDataMock).toHaveBeenCalledWith(mappedData);
    expect(dataEditorData.value).toEqual(mappedData);
    expect(schemaEditorSetDataMock).not.toHaveBeenCalled();
  });

  it('keeps the generation error visible when no mapping configuration was returned', async () => {
    const {wrapper, generateMappingFunctionSuggestionMock} = await setupDialog({
      currentData: {name: 'Ada'},
      currentSchema: {
        type: 'object',
        properties: {fullName: {type: 'string'}},
      },
    });
    generateMappingFunctionSuggestionMock.mockResolvedValue({
      config: '',
      success: false,
      message: 'Mapping generation failed.',
    });

    await openDialog(wrapper);
    await findButtonByText(wrapper, 'Generate Suggestion').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Mapping generation failed.');
  });

  it('includes a failed JavaScript validation in the next suggestion request', async () => {
    const {wrapper, generateMappingFunctionSuggestionMock, validateJavascriptMappingMock} =
      await setupDialog({
        currentData: {name: 'Ada'},
        currentSchema: {type: 'object'},
      });
    const failedMappingCode = 'function transform() { return {}; }';
    generateMappingFunctionSuggestionMock.mockResolvedValue({
      config: failedMappingCode,
      success: true,
      message: 'Mapping generated.',
    });
    validateJavascriptMappingMock.mockResolvedValue({
      success: false,
      message: 'fullName is required',
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[1]!.setValue('javascript');
    await flushPromises();
    await findButtonByText(wrapper, 'Generate Suggestion').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Regenerate Suggestion for Previous Error');

    await findButtonByText(wrapper, 'Regenerate Suggestion for Previous Error').trigger('click');
    await flushPromises();

    expect(generateMappingFunctionSuggestionMock.mock.calls[1]![0].retryContext).toEqual({
      validationError: 'fullName is required',
      previousCode: failedMappingCode,
    });
  });

  it('executes direct AI mapping and applies the returned result to the Data Editor', async () => {
    const currentData = {
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    const currentSchema = {
      type: 'object',
      properties: {
        fullName: {type: 'string'},
      },
      required: ['fullName'],
    };
    const {
      wrapper,
      dataEditorSetDataMock,
      schemaEditorSetDataMock,
      performDirectAiTargetSchemaMappingMock,
    } = await setupDialog({
      currentData,
      currentSchema,
    });

    performDirectAiTargetSchemaMappingMock.mockResolvedValue({
      resultData: {fullName: 'Ada Lovelace'},
      success: true,
      message: 'AI mapping executed successfully.',
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[0]!.setValue('direct-ai');
    await flushPromises();

    expect(wrapper.text()).toContain('Execute AI Mapping');
    expect(wrapper.text()).not.toContain('Generate Suggestion');

    await findButtonByText(wrapper, 'Execute AI Mapping').trigger('click');
    await flushPromises();

    expect(performDirectAiTargetSchemaMappingMock).toHaveBeenCalledWith(
      currentData,
      currentSchema,
      ''
    );
    expect(dataEditorSetDataMock).toHaveBeenCalledWith({fullName: 'Ada Lovelace'});
    expect(schemaEditorSetDataMock).not.toHaveBeenCalled();
  });

  it('applies a direct AI result without validating it against the target schema', async () => {
    const currentData = {
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    const currentSchema = {
      type: 'object',
      properties: {
        fullName: {type: 'string'},
      },
      required: ['fullName'],
    };
    const {wrapper, dataEditorSetDataMock, performDirectAiTargetSchemaMappingMock} =
      await setupDialog({
        currentData,
        currentSchema,
      });
    const schemaInvalidResult = {unexpected: true};

    performDirectAiTargetSchemaMappingMock.mockResolvedValue({
      resultData: schemaInvalidResult,
      success: true,
      message: 'AI mapping executed successfully.',
    });

    await openDialog(wrapper);
    await wrapper.findAll('select')[0]!.setValue('direct-ai');
    await flushPromises();
    await findButtonByText(wrapper, 'Execute AI Mapping').trigger('click');
    await flushPromises();

    expect(dataEditorSetDataMock).toHaveBeenCalledWith(schemaInvalidResult);
  });
});
