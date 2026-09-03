import {describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref, shallowRef} from 'vue';

type SetupOptions = {
  currentData?: unknown;
  currentSchema?: Record<string, unknown>;
  parsedData?: unknown;
  uploadedContent?: string;
};

async function setupDataImportDialog(options: SetupOptions = {}) {
  vi.resetModules();

  const currentData = options.currentData ?? {};
  const currentSchema = options.currentSchema ?? {
    type: 'object',
    properties: {name: {type: 'string'}},
  };
  const parsedData = options.parsedData ?? {name: 'Ada'};
  const uploadedContent = ref(options.uploadedContent ?? 'name=Ada');
  const dataEditorSetDataMock = vi.fn();
  const inferredSchema = {type: 'object', title: 'Inferred'};
  const inferredSchemaRef = ref<Record<string, unknown>>({});
  const inferJsonSchemaMock = vi.fn(() => inferredSchema);
  const generateImportScriptSuggestionMock = vi.fn();
  const generateParsedDataMappingScriptSuggestionMock = vi.fn();
  const runDirectParsedImportMock = vi.fn();
  const runFullAiImportMock = vi.fn();
  const runImportWithGeneratedScriptMock = vi.fn();
  const validateGeneratedImportScriptMock = vi.fn();

  const sourceFile = {
    selectedFileName: ref('sample.properties'),
    selectedFileSize: ref(8),
    selectedFileType: ref('text/plain'),
    uploadedContent,
    backendDisplayText: ref('Backend recognized properties.'),
    backendPromptHint: ref('Input contains key-value pairs.'),
    formatProcessingErrorMessage: ref(''),
    parsedJsonFromBackend: shallowRef(parsedData),
    preprocessedJsonForAi: shallowRef(parsedData),
    isDetectingFormat: ref(false),
    canUseDirectParse: ref(true),
    selectSourceFile: vi.fn().mockResolvedValue(true),
    resetSourceFile: vi.fn(),
  };

  vi.doMock('@/components/panels/shared-components/useAceEditor', () => ({
    useAceEditor: () => ({
      editorElementId: 'data-import-ai-editor',
      createEditor: vi.fn(),
      destroyEditor: vi.fn(),
    }),
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: (mode: string) =>
      mode === 'dataEditor'
        ? {data: ref(currentData), setData: dataEditorSetDataMock}
        : {data: ref(currentSchema), setData: vi.fn()},
    getSchemaForMode: () => ({schemaRaw: inferredSchemaRef}),
  }));
  vi.doMock('@/schema/inferJsonSchema', () => ({inferJsonSchema: inferJsonSchemaMock}));
  vi.doMock('@/settings/useSettings', () => ({
    useSettings: () => ref({backend: {formatProcessingUrl: 'http://format-processing.example'}}),
  }));
  vi.doMock('@/utility/ai/apiKey', () => ({getApiKeyRef: () => ref('test-api-key')}));
  vi.doMock('@/utility/ai/aiAvailability', () => ({canQueryAi: () => true}));
  vi.doMock('../useDataImportAiSourceFile', () => ({
    useDataImportAiSourceFile: () => sourceFile,
  }));
  vi.doMock('../dataImportAiService', () => ({
    generateImportScriptSuggestion: generateImportScriptSuggestionMock,
    generateParsedDataMappingScriptSuggestion: generateParsedDataMappingScriptSuggestionMock,
    runDirectParsedImport: runDirectParsedImportMock,
    runFullAiImport: runFullAiImportMock,
    runImportWithGeneratedScript: runImportWithGeneratedScriptMock,
    validateGeneratedImportScript: validateGeneratedImportScriptMock,
  }));

  const {INFER_SCHEMA_OPTION, useDataImportAiDialog, USE_CURRENT_SCHEMA_OPTION} = await import(
    '../useDataImportAiDialog'
  );
  const scope = effectScope();
  const dialog = scope.run(useDataImportAiDialog);
  if (!dialog) {
    throw new Error('Expected the data import dialog composable to initialize.');
  }

  return {
    dialog,
    scope,
    INFER_SCHEMA_OPTION,
    USE_CURRENT_SCHEMA_OPTION,
    dataEditorSetDataMock,
    inferredSchema,
    inferredSchemaRef,
    inferJsonSchemaMock,
    generateParsedDataMappingScriptSuggestionMock,
    runDirectParsedImportMock,
    runFullAiImportMock,
    runImportWithGeneratedScriptMock,
    validateGeneratedImportScriptMock,
  };
}

describe('useDataImportAiDialog', () => {
  it('requires a second unchanged import before applying a schema-mismatched result', async () => {
    const setup = await setupDataImportDialog();
    setup.dialog.selectedSchemaSource.value = setup.USE_CURRENT_SCHEMA_OPTION;
    setup.dialog.selectedImportMode.value = 'direct_parse';
    setup.runDirectParsedImportMock.mockResolvedValue({
      resultData: {unexpected: true},
      success: true,
      message: 'Schema mismatch detected. Click import again to continue anyway.',
      warningMessage: 'Parsed JSON does not match current schema.',
      confirmedMessage: 'Imported after confirmation.',
      requiresConfirmation: true,
    });

    await setup.dialog.importData();

    expect(setup.dataEditorSetDataMock).not.toHaveBeenCalled();
    expect(setup.dialog.warningMessage.value).toBe('Parsed JSON does not match current schema.');
    expect(setup.dialog.importButtonLabel.value).toBe('Import Anyway');

    await setup.dialog.importData();

    expect(setup.runDirectParsedImportMock).toHaveBeenCalledTimes(1);
    expect(setup.dataEditorSetDataMock).toHaveBeenCalledWith({unexpected: true});
    // the imported data is posted to the validation worker, which cannot clone reactive proxies
    expect(() =>
      structuredClone(setup.dataEditorSetDataMock.mock.calls[0][0])
    ).not.toThrow();
    expect(setup.dialog.statusMessage.value).toBe('Imported after confirmation.');
    setup.scope.stop();
  });

  it('infers and stores a schema when a direct parsed import succeeds', async () => {
    const setup = await setupDataImportDialog({parsedData: [{name: 'Ada'}]});
    setup.dialog.selectedImportMode.value = 'direct_parse';
    setup.runDirectParsedImportMock.mockResolvedValue({
      resultData: [{name: 'Ada'}],
      success: true,
      message: 'Imported directly.',
    });

    await setup.dialog.importData();

    expect(setup.inferJsonSchemaMock).toHaveBeenCalledWith([{name: 'Ada'}]);
    expect(setup.dataEditorSetDataMock).toHaveBeenCalledWith([{name: 'Ada'}]);
    expect(setup.inferredSchemaRef.value).toEqual(setup.inferredSchema);
    setup.scope.stop();
  });

  it('does not infer a structural schema for JSON-LD data', async () => {
    const jsonLdData = {
      '@context': {hobbit: 'https://w3id.org/hobbit/vocab#'},
      '@id': 'hobbit:result',
      '@type': 'hobbit:AnalysisResult',
    };
    const setup = await setupDataImportDialog({parsedData: jsonLdData});
    setup.dialog.selectedImportMode.value = 'direct_parse';
    setup.runDirectParsedImportMock.mockResolvedValue({
      resultData: jsonLdData,
      success: true,
      message: 'Imported directly.',
    });

    await setup.dialog.importData();

    expect(setup.inferJsonSchemaMock).not.toHaveBeenCalled();
    expect(setup.dataEditorSetDataMock).toHaveBeenCalledWith(jsonLdData);
    expect(setup.inferredSchemaRef.value).toEqual({});
    setup.scope.stop();
  });

  it('defaults a detected JSON-LD file to automatic schema handling', async () => {
    const setup = await setupDataImportDialog({
      parsedData: {'@graph': [{'@id': 'https://example.org/result'}]},
    });
    setup.dialog.openDialog();
    expect(setup.dialog.selectedSchemaSource.value).toBe(setup.USE_CURRENT_SCHEMA_OPTION);

    await setup.dialog.onFileSelected(new Event('change'));

    expect(setup.dialog.selectedSchemaSource.value).toBe(setup.INFER_SCHEMA_OPTION);
    setup.scope.stop();
  });

  it('does not apply data if schema inference fails', async () => {
    const setup = await setupDataImportDialog();
    setup.dialog.selectedImportMode.value = 'direct_parse';
    setup.runDirectParsedImportMock.mockResolvedValue({
      resultData: {name: 'Ada'},
      success: true,
      message: 'Imported directly.',
    });
    setup.inferJsonSchemaMock.mockImplementation(() => {
      throw new Error('cannot infer schema');
    });

    await setup.dialog.importData();

    expect(setup.dataEditorSetDataMock).not.toHaveBeenCalled();
    expect(setup.dialog.errorMessage.value).toContain('cannot infer schema');
    expect(setup.dialog.isImportingData.value).toBe(false);
    setup.scope.stop();
  });

  it('uses raw input after switching away from a parsed-data mapping suggestion', async () => {
    const setup = await setupDataImportDialog({
      parsedData: {name: 'Ada'},
      uploadedContent: 'name=Ada',
    });
    setup.dialog.selectedSchemaSource.value = setup.USE_CURRENT_SCHEMA_OPTION;
    setup.dialog.selectedImportMode.value = 'map_parsed_to_schema';
    setup.generateParsedDataMappingScriptSuggestionMock.mockResolvedValue({
      config: 'function transform(input) { return input; }',
      success: true,
      message: 'Generated mapping.',
    });
    setup.validateGeneratedImportScriptMock.mockResolvedValue({success: true, message: 'valid'});
    setup.runImportWithGeneratedScriptMock.mockResolvedValue({
      resultData: {name: 'Ada'},
      success: true,
      message: 'Imported raw input.',
    });

    await setup.dialog.generateSuggestion();
    setup.dialog.selectedImportMode.value = 'javascript_mapping';
    setup.dialog.selectedSchemaSource.value = setup.INFER_SCHEMA_OPTION;
    await nextTick();
    await setup.dialog.importData();

    expect(setup.validateGeneratedImportScriptMock).toHaveBeenCalledWith(
      'function transform(input) { return input; }',
      'name=Ada'
    );
    expect(setup.runImportWithGeneratedScriptMock).toHaveBeenCalledWith(
      'name=Ada',
      'function transform(input) { return input; }',
      'infer_from_data',
      expect.any(Object)
    );
    setup.scope.stop();
  });

  it('offers parsed-data schema mapping only when using the current schema', async () => {
    const setup = await setupDataImportDialog();
    const getModeValues = () => setup.dialog.importModeOptions.value.map(option => option.value);

    expect(getModeValues()).not.toContain('map_parsed_to_schema');

    setup.dialog.selectedSchemaSource.value = setup.USE_CURRENT_SCHEMA_OPTION;
    await nextTick();
    expect(getModeValues()).toContain('map_parsed_to_schema');

    setup.dialog.selectedImportMode.value = 'map_parsed_to_schema';
    setup.dialog.selectedSchemaSource.value = setup.INFER_SCHEMA_OPTION;
    await nextTick();

    expect(getModeValues()).not.toContain('map_parsed_to_schema');
    expect(setup.dialog.selectedImportMode.value).toBe('direct_parse');
    setup.scope.stop();
  });

  it('reports unexpected import failures and restores the loading state', async () => {
    const setup = await setupDataImportDialog();
    setup.dialog.selectedImportMode.value = 'full_ai_import';
    setup.runFullAiImportMock.mockRejectedValue(new Error('request failed'));

    await setup.dialog.importData();

    expect(setup.dialog.errorMessage.value).toContain('request failed');
    expect(setup.dialog.isImportingData.value).toBe(false);
    expect(setup.dataEditorSetDataMock).not.toHaveBeenCalled();
    setup.scope.stop();
  });

  it('invalidates a pending full-AI confirmation when the user changes their instructions', async () => {
    const setup = await setupDataImportDialog();
    setup.dialog.selectedSchemaSource.value = setup.USE_CURRENT_SCHEMA_OPTION;
    setup.dialog.selectedImportMode.value = 'full_ai_import';
    setup.runFullAiImportMock.mockResolvedValue({
      resultData: {unexpected: true},
      success: true,
      message: 'Schema mismatch detected.',
      requiresConfirmation: true,
    });

    await setup.dialog.importData();
    expect(setup.dialog.importButtonLabel.value).toBe('Import Anyway');

    setup.dialog.userComments.value = 'Use the name field instead.';
    await nextTick();

    expect(setup.dialog.importButtonLabel.value).toBe('Import with Full AI (No JS)');
    expect(setup.dialog.warningMessage.value).toBe('');
    setup.scope.stop();
  });
});
