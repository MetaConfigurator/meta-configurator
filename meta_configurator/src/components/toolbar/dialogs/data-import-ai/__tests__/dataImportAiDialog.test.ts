import {describe, expect, it, vi, beforeEach} from 'vitest';
import {nextTick, ref} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';
import {
  ButtonStub,
  createMockAceEditor,
  DialogStub,
  DividerStub,
  EmptyStub,
  InputTextStub,
  MessageStub,
  type MockAceEditor,
  SelectStub,
  SlotStub,
  TextareaStub,
} from '@/components/toolbar/dialogs/__tests__/dialogTestUtils';

async function setupDialog() {
  vi.resetModules();

  const apiKeyRef = ref('');
  const settingsRef = ref({
    backend: {
      formatProcessingUrl: 'http://127.0.0.1:5001',
    },
    textEditor: {
      tabSize: 2,
    },
    aiIntegration: {
      backend: {endpoint: 'https://api.openai.com/v1/'},
    },
  });
  const editors: MockAceEditor[] = [];
  const aceEditMock = vi.fn(() => {
    const editor = createMockAceEditor();
    editors.push(editor);
    return editor;
  });

  vi.doMock('primevue/dialog', () => ({default: DialogStub}));
  vi.doMock('primevue/button', () => ({default: ButtonStub}));
  vi.doMock('primevue/textarea', () => ({default: TextareaStub}));
  vi.doMock('primevue/select', () => ({default: SelectStub}));
  vi.doMock('primevue/inputtext', () => ({default: InputTextStub}));
  vi.doMock('primevue/message', () => ({default: MessageStub}));
  vi.doMock('primevue/divider', () => ({default: DividerStub}));
  vi.doMock('@/components/panels/ai-prompts/ApiKey.vue', () => ({default: EmptyStub}));
  vi.doMock('@/components/panels/ai-prompts/ApiKeyWarning.vue', () => ({default: EmptyStub}));
  vi.doMock('@/components/panels/shared-components/PanelSettings.vue', () => ({default: SlotStub}));
  vi.doMock('@/components/panels/shared-components/aceUtils', () => ({
    // setupAceProperties returns the callback that stops its settings watchers.
    setupAceProperties: vi.fn(() => vi.fn()),
  }));
  vi.doMock('@/settings/useSettings', () => ({
    useSettings: () => settingsRef,
  }));
  vi.doMock('@/utility/ai/apiKey', () => ({
    getApiKeyRef: () => apiKeyRef,
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: vi.fn(() => ({
      data: ref({}),
      setData: vi.fn(),
    })),
    getSchemaForMode: vi.fn(() => ({
      schemaRaw: ref({}),
    })),
  }));
  vi.doMock('brace', () => ({
    edit: aceEditMock,
  }));
  vi.doMock('brace/mode/javascript', () => ({}));
  vi.doMock('brace/mode/jsoniq', () => ({}));

  const DataImportAiDialog = (
    await import('@/components/toolbar/dialogs/data-import-ai/DataImportAiDialog.vue')
  ).default;

  const wrapper = mount(DataImportAiDialog, {
    attachTo: document.body,
  });

  return {wrapper, apiKeyRef, aceEditMock, editors};
}

describe('DataImportAiDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes the Ace editor when an API key is added after opening the dialog', async () => {
    const {wrapper, apiKeyRef, aceEditMock, editors} = await setupDialog();

    (wrapper.vm as any).show();
    await nextTick();
    await flushPromises();

    expect(aceEditMock).not.toHaveBeenCalled();

    apiKeyRef.value = 'test-key';
    await nextTick();
    await flushPromises();

    expect(aceEditMock).toHaveBeenCalledTimes(1);
    expect(editors[0]?.setValue).toHaveBeenCalledWith(
      `function transform(input) {\n  return input;\n}`,
      -1
    );
  });

  it('preserves the current script when the editor is torn down and recreated', async () => {
    const {wrapper, apiKeyRef, editors} = await setupDialog();

    apiKeyRef.value = 'test-key';
    (wrapper.vm as any).show();
    await nextTick();
    await flushPromises();

    const firstEditor = editors[0];
    expect(firstEditor).toBeDefined();
    if (!firstEditor) {
      throw new Error('Expected the initial editor to be created.');
    }

    firstEditor.state.currentValue = `function transform(input) {\n  return {source: input};\n}`;

    apiKeyRef.value = '';
    await nextTick();
    await flushPromises();

    expect(firstEditor.destroy).toHaveBeenCalledTimes(1);

    apiKeyRef.value = 'test-key-again';
    await nextTick();
    await flushPromises();

    const recreatedEditor = editors[1];
    expect(recreatedEditor).toBeDefined();
    expect(recreatedEditor?.setValue).toHaveBeenCalledWith(firstEditor.state.currentValue, -1);
  });

  it('enables AI modes through a relay without requiring a browser API key', async () => {
    const {wrapper, apiKeyRef, aceEditMock} = await setupDialog();
    const settings = (await import('@/settings/useSettings')).useSettings();
    settings.value.aiIntegration.backend = {
      relay: 'https://metaconfigurator.example/relay',
      endpoint: 'https://provider.example/v1/',
    };

    expect(apiKeyRef.value).toBe('');
    (wrapper.vm as any).show();
    await nextTick();
    await flushPromises();

    expect(aceEditMock).toHaveBeenCalledTimes(1);
  });

  it('hides additional hints when importing the backend result directly', async () => {
    const {wrapper} = await setupDialog();

    (wrapper.vm as any).show();
    await nextTick();
    expect(wrapper.find('[data-testid="additional-import-hints"]').exists()).toBe(true);

    await wrapper.findAll('select')[1]!.setValue('direct_parse');

    expect(wrapper.find('[data-testid="additional-import-hints"]').exists()).toBe(false);
  });
});
