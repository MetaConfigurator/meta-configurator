import {beforeEach, describe, expect, it, vi} from 'vitest';
import {defineComponent} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';

// --- Stubs ------------------------------------------------------------------

const DialogStub = defineComponent({template: '<div><slot /></div>'});
const ButtonStub = defineComponent({
  props: {disabled: {type: Boolean, default: false}},
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});
const SelectStub = defineComponent({template: '<div class="select-stub" />'});
const MessageStub = defineComponent({template: '<div class="message"><slot /></div>'});
const IconStub = defineComponent({template: '<i />'});
// Stub the attempt view so we can read which attempts are displayed and click Apply.
const AttemptStub = defineComponent({
  props: {attempt: {type: Object, required: true}, index: {type: Number, default: 0}},
  template:
    '<div class="attempt-stub" :data-success="attempt.success">' +
    '<slot name="actions" :attempt="attempt" /></div>',
});

function button(wrapper: any, text: string) {
  return wrapper.findAll('button').find((b: any) => b.text().includes(text));
}

function step(source: string, target: string) {
  return {
    sourceLanguage: source,
    targetLanguage: target,
    serviceName: 'FlaskApp',
    converterName: 'c',
  };
}

const fetchMock = vi.fn();

function jsonResults(results: unknown[]) {
  return {
    ok: true,
    status: 200,
    headers: {get: () => 'application/json'},
    json: async () => ({results}),
    text: async () => JSON.stringify({results}),
  };
}

/**
 * Wire up the module mocks (acting as a mock schema-conversion orchestrator and
 * file picker), then mount the dialog. Uses vi.doMock + dynamic import so the
 * mocks apply to the freshly-imported component (this vitest version has no
 * vi.hoisted).
 */
async function setupDialog() {
  vi.resetModules();

  const setDataMock = vi.fn();
  const toastAddMock = vi.fn();
  const onErrorMock = vi.fn();

  vi.doMock('@/settings/useSettings', () => ({
    useSettings: () => ({value: {backend: {schemaConverterUrl: 'http://mock-orchestrator'}}}),
  }));
  vi.doMock('@/utility/fileDialogUtils', () => ({
    createLazySingleFileDialog: () => ({
      openForSelection: (handler: (files: any) => void) => handler([{name: 'person.xsd'}]),
    }),
  }));
  vi.doMock('@/utility/readFileContent', () => ({
    readFileContent: vi.fn().mockResolvedValue('<xsd:schema/>'),
  }));
  vi.doMock('@/data/useDataLink', () => ({
    getDataForMode: () => ({setData: setDataMock, data: {value: {}}}),
  }));
  vi.doMock('@/utility/toastService', () => ({toastService: {add: toastAddMock}}));
  vi.doMock('@/utility/errorServiceInstance', () => ({
    useErrorService: () => ({onError: onErrorMock}),
  }));

  const ImportSchemaDialog = (
    await import('@/components/toolbar/dialogs/schema-conversion/ImportSchemaDialog.vue')
  ).default;

  const wrapper = mount(ImportSchemaDialog, {
    global: {
      stubs: {
        Dialog: DialogStub,
        Button: ButtonStub,
        Select: SelectStub,
        Message: MessageStub,
        FontAwesomeIcon: IconStub,
        ConversionAttemptView: AttemptStub,
      },
    },
  });

  return {wrapper, setDataMock, toastAddMock, onErrorMock};
}

async function selectFileAndConvert(wrapper: any) {
  (wrapper.vm as any).show();
  await flushPromises();
  await button(wrapper, 'Select File').trigger('click');
  await flushPromises(); // file read + language auto-detect
  await button(wrapper, 'Convert').trigger('click');
  await flushPromises(); // conversion request
}

describe('ImportSchemaDialog (mock orchestrator)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('shows only successful attempts when at least one succeeds, and Apply sets the schema', async () => {
    fetchMock.mockResolvedValue(
      jsonResults([
        {success: true, result: '{"title":"Person"}', conversionPath: [step('Xsd', 'JsonSchema')]},
        {success: true, result: '{"title":"Other"}', conversionPath: [step('Xsd', 'JsonSchema')]},
        {success: false, result: 'failed somehow', conversionPath: [step('Xsd', 'JsonSchema')]},
      ])
    );

    const {wrapper, setDataMock, toastAddMock} = await setupDialog();
    await selectFileAndConvert(wrapper);

    // The orchestrator was called once with JSON Schema as the fixed target.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.sourceLanguage).toBe('Xsd'); // auto-detected from person.xsd
    expect(body.targetLanguage).toBe('JsonSchema');

    // Only the two successful attempts are displayed (the failure is hidden).
    const shown = wrapper.findAll('.attempt-stub');
    expect(shown).toHaveLength(2);
    expect(shown.every(s => s.attributes('data-success') === 'true')).toBe(true);

    // Apply the first result -> parsed schema is set, success toast shown.
    await button(wrapper, 'Apply').trigger('click');
    await flushPromises();
    expect(setDataMock).toHaveBeenCalledTimes(1);
    expect(setDataMock.mock.calls[0]![0]).toEqual({title: 'Person'});
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
  });

  it('shows failed attempts only when no attempt succeeded', async () => {
    fetchMock.mockResolvedValue(
      jsonResults([
        {success: false, result: 'err 1', conversionPath: [step('Xsd', 'JsonSchema')]},
        {success: false, result: 'err 2', conversionPath: [step('Xsd', 'JsonSchema')]},
      ])
    );

    const {wrapper} = await setupDialog();
    await selectFileAndConvert(wrapper);

    const shown = wrapper.findAll('.attempt-stub');
    expect(shown).toHaveLength(2);
    expect(shown.every(s => s.attributes('data-success') === 'false')).toBe(true);
  });

  it('surfaces a request-level error when the service is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const {wrapper} = await setupDialog();
    await selectFileAndConvert(wrapper);

    expect(wrapper.findAll('.attempt-stub')).toHaveLength(0);
    expect(wrapper.find('.message').text()).toMatch(
      /Could not reach the schema conversion service/
    );
  });
});
