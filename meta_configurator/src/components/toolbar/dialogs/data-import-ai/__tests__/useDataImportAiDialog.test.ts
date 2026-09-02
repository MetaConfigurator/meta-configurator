import {describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref} from 'vue';

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
  const generateNormalizationScriptSuggestionMock = vi.fn();
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
    isFormatProcessingUnavailable: ref(false),
    parsedJsonFromBackend: ref(parsedData),
    preprocessedJsonForAi: ref(parsedData),
    isDetectingFormat: ref(false),
    canUseDirectParse: ref(true),
    selectSourceFile: vi.fn(),
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
    generateNormalizationScriptSuggestion: generateNormalizationScriptSuggestionMock,
    runDirectParsedImport: runDirectParsedImportMock,
    runFullAiImport: runFullAiImportMock,
    runImportWithGeneratedScript: runImportWithGeneratedScriptMock,
    validateGeneratedImportScript: validateGeneratedImportScriptMock,
  }));

  const {useDataImportAiDialog, USE_CURRENT_SCHEMA_OPTION} = await import(
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
    USE_CURRENT_SCHEMA_OPTION,
    dataEditorSetDataMock,
    inferredSchema,
    inferredSchemaRef,
    inferJsonSchemaMock,
    generateNormalizationScriptSuggestionMock,
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

  it('uses raw input after switching away from an AI normalization suggestion', async () => {
    const setup = await setupDataImportDialog({
      parsedData: {name: 'Ada'},
      uploadedContent: 'name=Ada',
    });
    setup.dialog.selectedImportMode.value = 'ai_normalize_parsed';
    setup.generateNormalizationScriptSuggestionMock.mockResolvedValue({
      config: 'function transform(input) { return input; }',
      success: true,
      message: 'Generated normalization.',
    });
    setup.validateGeneratedImportScriptMock.mockResolvedValue({success: true, message: 'valid'});
    setup.runImportWithGeneratedScriptMock.mockResolvedValue({
      resultData: {name: 'Ada'},
      success: true,
      message: 'Imported raw input.',
    });

    await setup.dialog.generateSuggestion();
    setup.dialog.selectedImportMode.value = 'javascript_mapping';
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
